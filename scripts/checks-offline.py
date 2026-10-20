"""Run the public mock tests, TypeScript checks and web build without egress.

The workflow uses noninteractive sudo only on its ephemeral GitHub-hosted runner
to let bubblewrap set up namespaces under Ubuntu's AppArmor policy. Local runs
do not need sudo when unprivileged namespaces are supported. Application code
runs with all capabilities dropped and no new privileges; no host security
policy is disabled. If namespace setup fails, stop rather than run unsandboxed.
"""
import argparse
import errno
import hashlib
import os
from pathlib import Path
import shutil
import socket
import stat
import subprocess
import tempfile


ROOT = Path(__file__).resolve().parents[1]
OMIT = {'.git', 'node_modules', 'dist', '.venv', '__pycache__', '.pytest_cache',
        '.vite', '.vite-temp', 'coverage', 'playwright-report', 'test-results'}


def files(root):
    for directory, names, filenames in os.walk(root, followlinks=False):
        names[:] = [name for name in names if name not in OMIT]
        for name in names:
            if (Path(directory) / name).is_symlink():
                raise ValueError('Source directory symlinks are not admitted')
        for name in filenames:
            if name in {'.env', '.npmrc'} or (name.startswith('.env.') and name != '.env.example'):
                continue
            path = Path(directory) / name
            if path.is_symlink():
                raise ValueError('Source file symlinks are not admitted')
            yield path


def hashes(root):
    return {str(path.relative_to(root)): hashlib.sha256(path.read_bytes()).hexdigest()
            for path in files(root)}


def dependency_manifest(root):
    """Hash regular files and link text, never dereference package symlinks."""
    result = {}
    for directory, names, filenames in os.walk(root, followlinks=False):
        for name in sorted(names + filenames):
            path = Path(directory) / name
            info = path.lstat()
            key = str(path.relative_to(root))
            if stat.S_ISLNK(info.st_mode):
                result[key] = ('symlink', os.readlink(path))
            elif stat.S_ISDIR(info.st_mode):
                result[key] = ('directory', stat.S_IMODE(info.st_mode))
            elif stat.S_ISREG(info.st_mode):
                if info.st_mode & (stat.S_ISUID | stat.S_ISGID):
                    raise ValueError('Privileged dependency executables are not admitted')
                result[key] = ('file', stat.S_IMODE(info.st_mode),
                               hashlib.sha256(path.read_bytes()).hexdigest())
            else:
                raise ValueError('Special dependency files are not admitted')
    return result


def copy_dependency(source, target):
    # npm test invokes .bin links: retain executable bits, not ownership/xattrs.
    shutil.copyfile(source, target)
    os.chmod(target, stat.S_IMODE(os.stat(source).st_mode))
    return target


def probe():
    status = dict(line.split(':', 1) for line in Path('/proc/self/status').read_text().splitlines()
                  if ':' in line)
    assert int(status['CapEff'].strip(), 16) == 0, 'Application must have no effective capabilities'
    assert status['NoNewPrivs'].strip() == '1', 'Application must not gain privileges'
    assert not Path('/home/martin').exists() and not Path('/root').exists()
    assert not Path('/work/.git').exists() and not Path('/work/.env').exists()
    assert not any(name.endswith(('_TOKEN', '_API_KEY')) for name in os.environ)
    for path in ('/work/README.md', '/node_modules/package.json'):
        try:
            descriptor = os.open(path, os.O_WRONLY | os.O_CREAT, 0o600)
        except OSError as error:
            assert error.errno == errno.EROFS, 'Source and dependencies must be read-only'
        else:
            os.close(descriptor)
            raise AssertionError('Unexpected writable source or dependencies')
    with socket.socket() as connection:
        connection.settimeout(.5)
        try:
            connection.connect(('1.1.1.1', 443))
        except OSError as error:
            assert error.errno == errno.ENETUNREACH
        else:
            raise AssertionError('Unexpected external network access')


def inner(npm_cli):
    probe()
    for path in ('/tmp/user.npmrc', '/tmp/global.npmrc'):
        Path(path).write_text('')
    node = '/opt/node/bin/node'
    version = subprocess.check_output([node, '--version'], text=True).strip()
    assert version.startswith('v22.'), 'Use the reviewed Node.js 22 runtime'
    commands = (
        [node, npm_cli, 'test'],
        [node, '/node_modules/typescript/bin/tsc', '--noEmit', '-p', '/work/tsconfig.json'],
        [node, npm_cli, 'run', 'build:web', '--', '--configLoader', 'runner',
         '--outDir', '/tmp/gest-web-dist', '--emptyOutDir'],
    )
    for label, command in zip(('Public mock and first-account tests', 'TypeScript', 'Web build'), commands):
        print(label + ':', flush=True)
        subprocess.run(command, check=True, timeout=180, stdin=subprocess.DEVNULL)
    assert Path('/tmp/gest-web-dist/index.html').is_file()


def prefix(snapshot, dependencies, node, npm_root, scratch):
    command = ['bwrap', '--unshare-all', '--unshare-user', '--disable-userns', '--cap-drop', 'ALL',
               '--die-with-parent', '--new-session', '--clearenv']
    for name in ('usr', 'bin', 'sbin', 'lib', 'lib64'):
        path = Path('/') / name
        if path.is_symlink():
            command += ['--symlink', os.readlink(path), '/' + name]
        elif path.exists():
            command += ['--ro-bind', str(path), str(path)]
    if Path('/etc/ld.so.cache').exists():
        command += ['--ro-bind', '/etc/ld.so.cache', '/etc/ld.so.cache']
    # setup-node may install npm outside /usr; bind only that trusted CLI package.
    if not npm_root.is_relative_to('/usr'):
        if not npm_root.is_relative_to('/opt/hostedtoolcache/node'):
            raise ValueError('npm must be installed under /usr or the hosted Node tool cache')
        command += ['--ro-bind', str(npm_root), str(npm_root)]
    command += ['--ro-bind', str(scratch / 'hosts'), '/etc/hosts',
                '--ro-bind', str(scratch / 'nsswitch.conf'), '/etc/nsswitch.conf',
                '--proc', '/proc', '--dev', '/dev', '--size', '536870912', '--tmpfs', '/tmp',
                '--ro-bind', str(snapshot), '/work',
                '--ro-bind', str(dependencies), '/node_modules',
                '--ro-bind', str(node), '/opt/node/bin/node']
    for key, value in {'PATH': '/opt/node/bin:/node_modules/.bin:/usr/bin:/bin',
                       'HOME': '/tmp', 'LANG': 'C.UTF-8', 'TMPDIR': '/tmp', 'CI': 'true',
                       'NODE_OPTIONS': '--max-old-space-size=1024',
                       'npm_config_cache': '/tmp/npm-cache', 'npm_config_offline': 'true',
                       'npm_config_userconfig': '/tmp/user.npmrc',
                       'npm_config_globalconfig': '/tmp/global.npmrc',
                       'npm_config_ignore_scripts': 'true',
                       'PYTHONDONTWRITEBYTECODE': '1', 'PYTHONNOUSERSITE': '1'}.items():
        command += ['--setenv', key, value]
    return command


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--dependencies')
    parser.add_argument('--node')
    parser.add_argument('--npm-cli', help='Path to npm-cli.js from the same Node installation')
    parser.add_argument('--inner', action='store_true', help=argparse.SUPPRESS)
    args = parser.parse_args()
    if args.inner:
        inner(args.npm_cli)
        return
    if not (args.dependencies and args.node and args.npm_cli):
        parser.error('Explicit dependency-only node_modules, Node and npm-cli.js paths are required')
    dependencies = Path(args.dependencies).resolve(strict=True)
    node = Path(args.node).resolve(strict=True)
    npm_cli = Path(args.npm_cli).resolve(strict=True)
    if npm_cli.name != 'npm-cli.js' or npm_cli.parent.name != 'bin' or npm_cli.parent.parent.name != 'npm':
        parser.error('Expected the trusted npm package bin/npm-cli.js entry point')
    npm_root = npm_cli.parent.parent
    before = hashes(ROOT)
    dependencies_before = dependency_manifest(dependencies)
    with tempfile.TemporaryDirectory(prefix='gest-public-check-') as temporary:
        scratch = Path(temporary)
        snapshot = scratch / 'source'
        for source in files(ROOT):
            target = snapshot / source.relative_to(ROOT)
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(source, target)
        (scratch / 'hosts').write_text('127.0.0.1 localhost\n::1 localhost\n')
        (scratch / 'nsswitch.conf').write_text('hosts: files\n')
        # A sudo-launched user namespace cannot traverse another user's private
        # checkout directories after dropping capabilities. Stage packages into
        # this launcher's private temporary directory instead of relaxing access.
        staged_dependencies = scratch / 'node_modules'
        shutil.copytree(dependencies, staged_dependencies, symlinks=True,
                        copy_function=copy_dependency)
        assert dependency_manifest(staged_dependencies) == dependencies_before
        assert hashes(snapshot) == before
        command = prefix(snapshot, staged_dependencies, node, npm_root, scratch)
        command += ['--chdir', '/work', '--', '/usr/bin/python3',
                    '/work/scripts/checks-offline.py', '--inner', '--npm-cli', str(npm_cli)]
        result = subprocess.run(command, env={'PATH': '/usr/bin:/bin'}, timeout=600,
                                stdin=subprocess.DEVNULL)
        assert hashes(snapshot) == before, 'Snapshot changed during isolated checks'
        assert hashes(ROOT) == before, 'Source changed during isolated checks'
        assert dependency_manifest(staged_dependencies) == dependencies_before, 'Staged dependencies changed'
        assert dependency_manifest(dependencies) == dependencies_before, 'Original dependencies changed'
        if result.returncode:
            raise SystemExit(result.returncode)
    print('Public tests, TypeScript and web build passed; source and dependency hashes preserved. '
          'No private home, credentials or external network were available.')


if __name__ == '__main__':
    main()

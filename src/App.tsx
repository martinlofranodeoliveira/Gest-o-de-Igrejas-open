import React, { useEffect, useRef, useState } from 'react';
import {
  Building2,
  Cake,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Copy,
  CreditCard,
  Droplets,
  HandCoins,
  Key,
  Landmark,
  LayoutDashboard,
  LifeBuoy,
  Lock,
  LogOut,
  Pencil,
  Plus,
  Save,
  Search,
  ShieldCheck,
  Trash2,
  TrendingUp,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { cn } from './lib/utils';
import {
  formatDateLabel,
  getMonthKey,
  isBirthdayThisMonth,
  isDateInCurrentMonth,
  normalizeCurrencyNumber,
  normalizeDateValue,
} from './lib/dataFormat';
import { createAuthService } from './authFactory';
import { createRepository } from './repositoryFactory';
import {
  IDataRepository,
  IAuthService,
  Member,
  MemberStatus,
  PaymentMethod,
  Tithe,
  User as AppUser,
} from './types';

type AppView = 'dashboard' | 'members' | 'member-form' | 'tithes';

type AppServices = {
  authService: IAuthService;
  memberRepo: IDataRepository<Member>;
  titheRepo: IDataRepository<Tithe>;
};

type NoticeTone = 'success' | 'error' | 'info';

type NoticeState = {
  id: number;
  title: string;
  message: string;
  tone: NoticeTone;
};

type MemberFormState = {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  birthDate: string;
  baptismDate: string;
  status: MemberStatus;
  isTither: boolean;
  notes: string;
};

type TitheFormState = {
  memberId: string;
  amount: string;
  paymentMethod: PaymentMethod;
  contributionDate: string;
  status: 'Confirmado' | 'Pendente';
  notes: string;
};

const paymentMethods: PaymentMethod[] = ['PIX', 'Espécie', 'Cartão', 'Transferência'];
const memberStatuses: MemberStatus[] = ['Ativo', 'Visitante', 'Inativo'];
const PRODUCT_NAME = 'Gestão de Igrejas Open';
const AUTHOR_NAME = 'Martin Lofrano';
const SUPPORT_URL = 'https://github.com/martinlofranodeoliveira/Gest-o-de-Igrejas-open/issues';

const sidebarItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'members', label: 'Membros', icon: Users },
  { id: 'tithes', label: 'Dízimos', icon: HandCoins },
] as const;

function isDesktopShell() {
  return typeof navigator !== 'undefined' && /electron/i.test(navigator.userAgent);
}

function hasElectronBridge() {
  return typeof window !== 'undefined' && typeof window.electronAPI !== 'undefined';
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function emptyMemberForm(): MemberFormState {
  return {
    fullName: '',
    email: '',
    phone: '',
    address: '',
    birthDate: '',
    baptismDate: '',
    status: 'Ativo',
    isTither: false,
    notes: '',
  };
}

function emptyTitheForm(): TitheFormState {
  return {
    memberId: '',
    amount: '',
    paymentMethod: 'PIX',
    contributionDate: todayIso(),
    status: 'Confirmado',
    notes: '',
  };
}

function normalizeMember(raw: Partial<Member> & Record<string, unknown>): Member {
  const statusFromLegacy = String(raw.type || '').toLowerCase();
  const rawTither = raw.isTither as unknown;
  let fallbackStatus: MemberStatus = 'Ativo';
  if (statusFromLegacy.includes('afast')) {
    fallbackStatus = 'Inativo';
  } else if (statusFromLegacy.includes('visit')) {
    fallbackStatus = 'Visitante';
  }

  return {
    id: String(raw.id || ''),
    fullName: String(raw.fullName || raw.name || ''),
    email: String(raw.email || ''),
    phone: String(raw.phone || ''),
    address: String(raw.address || ''),
    birthDate: normalizeDateValue(raw.birthDate),
    baptismDate: normalizeDateValue(raw.baptismDate || raw.date),
    status: (raw.status as MemberStatus) || fallbackStatus,
    isTither:
      rawTither === true ||
      rawTither === 1 ||
      rawTither === '1' ||
      rawTither === 'true',
    notes: String(raw.notes || ''),
    createdAt: normalizeDateValue(raw.createdAt || raw.date) || todayIso(),
  };
}

function normalizeTithe(raw: Partial<Tithe> & Record<string, unknown>): Tithe {
  return {
    id: String(raw.id || ''),
    memberId: String(raw.memberId || ''),
    memberName: String(raw.memberName || raw.name || 'Contribuinte'),
    amount: normalizeCurrencyNumber(raw.amount),
    paymentMethod: (raw.paymentMethod as PaymentMethod) || (raw.method as PaymentMethod) || 'PIX',
    contributionDate: normalizeDateValue(raw.contributionDate || raw.date) || todayIso(),
    status: (raw.status as 'Confirmado' | 'Pendente') || 'Confirmado',
    notes: String(raw.notes || raw.type || ''),
    createdAt: normalizeDateValue(raw.createdAt || raw.contributionDate || raw.date) || todayIso(),
  };
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number.isFinite(value) ? value : 0);
}

function formatDate(dateString: string) {
  return formatDateLabel(dateString);
}

function monthKey(dateString: string) {
  return getMonthKey(dateString);
}

function monthLabel(date: Date) {
  return new Intl.DateTimeFormat('pt-BR', { month: 'short' })
    .format(date)
    .replace('.', '')
    .toUpperCase();
}

function getLastSixMonthBuckets() {
  const buckets: Array<{ key: string; label: string }> = [];
  const now = new Date();

  for (let offset = 5; offset >= 0; offset -= 1) {
    const current = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    buckets.push({
      key: `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`,
      label: monthLabel(current),
    });
  }

  return buckets;
}

function getInitials(value: string) {
  return value
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');
}

function isCurrentMonth(dateString: string) {
  return isDateInCurrentMonth(dateString);
}

function isBirthdayInCurrentMonth(dateString: string) {
  return isBirthdayThisMonth(dateString);
}

function downloadCsv(fileName: string, content: string) {
  const blob = new Blob(['\uFEFF', content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function SidebarNavButton({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: typeof LayoutDashboard;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all',
        active
          ? 'bg-surface-container-lowest text-primary shadow-sm'
          : 'text-on-surface/65 hover:bg-surface hover:translate-x-1',
      )}
    >
      <Icon size={18} />
      <span>{label}</span>
    </button>
  );
}

function MetricCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'primary',
}: {
  label: string;
  value: string;
  hint?: string;
  icon: typeof LayoutDashboard;
  tone?: 'primary' | 'secondary' | 'error';
}) {
  const toneClasses =
    tone === 'secondary'
      ? 'bg-secondary-container text-on-secondary-container'
      : tone === 'error'
        ? 'bg-error-container/20 text-error'
        : 'bg-primary-container text-on-primary-container';

  return (
    <div className="rounded-[1.5rem] bg-surface-container-lowest p-6 shadow-sm">
      <div className="mb-4 flex items-start justify-between">
        <div className={cn('rounded-xl p-3', toneClasses)}>
          <Icon size={18} />
        </div>
        {hint ? (
          <span className="rounded-md bg-surface-container-low px-2 py-1 text-xs font-bold text-primary">
            {hint}
          </span>
        ) : null}
      </div>
      <p className="text-sm font-medium text-on-surface-variant">{label}</p>
      <p className="mt-1 font-headline text-3xl font-extrabold text-on-surface">{value}</p>
    </div>
  );
}

function EmptyPanel({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="rounded-[2rem] bg-surface-container-low p-10 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-container text-on-primary-container">
        <CircleAlert size={20} />
      </div>
      <h3 className="mt-4 font-headline text-2xl font-bold">{title}</h3>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-on-surface-variant">{description}</p>
      {actionLabel && onAction ? (
        <button type="button" onClick={onAction} className="satin-gradient mt-6 rounded-xl px-6 py-3 text-sm font-bold text-on-primary shadow-lg">
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}

function NoticeToast({
  notice,
  onClose,
}: {
  notice: NoticeState;
  onClose: () => void;
}) {
  const toneClasses =
    notice.tone === 'success'
      ? 'border-secondary-container bg-secondary-container/65 text-on-secondary-container'
      : notice.tone === 'info'
        ? 'border-primary-container bg-primary-container/70 text-on-primary-container'
        : 'border-error-container bg-error-container/70 text-error';

  return (
    <div className="pointer-events-auto fixed bottom-6 right-6 z-[90] w-full max-w-sm">
      <div className={cn('rounded-[1.5rem] border p-5 shadow-xl backdrop-blur-sm', toneClasses)}>
        <div className="flex items-start gap-4">
          <div className="mt-0.5">
            {notice.tone === 'success' ? <CheckCircle2 size={20} /> : <CircleAlert size={20} />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold">{notice.title}</p>
            <p className="mt-1 text-sm leading-6 opacity-90">{notice.message}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 opacity-75 transition-opacity hover:opacity-100"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

function SupportDialog({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-on-surface/25 p-6 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-[2rem] bg-surface-container-lowest p-8 shadow-2xl">
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-primary">Ajuda</p>
            <h2 className="mt-2 font-headline text-3xl font-extrabold text-on-surface">
              Uso rápido do sistema
            </h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-full bg-surface-container-low p-2 text-on-surface-variant">
            <X size={18} />
          </button>
        </div>

        <div className="mt-8 space-y-4 text-sm leading-6 text-on-surface-variant">
          <p>1. Cadastre cada membro com os dados básicos, data de nascimento e data de batismo.</p>
          <p>2. Marque no cadastro quem participa regularmente dos dízimos.</p>
          <p>3. Lance cada contribuição no módulo de dízimos para manter o histórico atualizado.</p>
          <p>4. Exporte o relatório em CSV quando precisar organizar a prestação de contas.</p>
        </div>

        <div className="mt-8 rounded-2xl bg-surface-container-low p-5 text-sm text-on-surface-variant">
          <p className="font-semibold text-on-surface">Criado por {AUTHOR_NAME}</p>
          <p className="mt-2 break-all">
            Código aberto:{' '}
            <a href={SUPPORT_URL} className="font-semibold text-primary">
              Problemas e sugestões
            </a>
          </p>
          <p className="mt-2">Envie sugestões e relate problemas no repositório público.</p>
        </div>
      </div>
    </div>
  );
}

function DesktopBridgeErrorScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 text-on-surface">
      <div className="w-full max-w-2xl rounded-[2rem] bg-surface-container-lowest p-10 shadow-xl">
        <p className="text-sm font-bold uppercase tracking-[0.24em] text-error">Abertura interrompida</p>
        <h1 className="mt-4 font-headline text-4xl font-extrabold text-on-surface">
          Não foi possível carregar os recursos locais do sistema.
        </h1>
        <p className="mt-4 text-base leading-7 text-on-surface-variant">
          Feche e abra o aplicativo novamente. Se a mensagem continuar, reinstale esta cópia do{' '}
          {PRODUCT_NAME} nesta máquina.
        </p>
        <div className="mt-8 flex justify-end">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="satin-gradient rounded-xl px-8 py-4 text-sm font-bold text-on-primary shadow-lg"
          >
            Recarregar sistema
          </button>
        </div>
      </div>
    </div>
  );
}

function ActivationScreen({ onActivate }: { onActivate: () => void }) {
  const [licenseKey, setLicenseKey] = useState('');
  const [machineFingerprint, setMachineFingerprint] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;

    const loadFingerprint = async () => {
      if (typeof window === 'undefined' || !window.electronAPI) {
        return;
      }

      try {
        const fingerprint = await window.electronAPI.getMachineFingerprint();
        if (active) {
          setMachineFingerprint(fingerprint);
        }
      } catch (_error) {
        if (active) {
          setMachineFingerprint('INDISPONÍVEL');
        }
      }
    };

    loadFingerprint();

    return () => {
      active = false;
    };
  }, []);

  const copyFingerprint = async () => {
    if (!machineFingerprint) {
      return;
    }

    await navigator.clipboard.writeText(machineFingerprint);
  };

  const submit = async () => {
    setLoading(true);
    setError(false);

    try {
      const success = await window.electronAPI.verifyLicense(licenseKey.trim());
      if (success) {
        onActivate();
      } else {
        setError(true);
      }
    } catch (_error) {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-[34rem_1fr]">
      <div className="flex flex-col justify-between bg-surface-container-low px-10 py-12">
        <div>
          <div className="flex items-center gap-3 text-primary">
            <div className="rounded-2xl bg-primary-container p-3 text-on-primary-container">
              <Building2 size={22} />
            </div>
            <div>
              <p className="font-headline text-2xl font-extrabold">{PRODUCT_NAME}</p>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-on-surface-variant">
                Sistema local da igreja
              </p>
            </div>
          </div>

          <div className="mt-16 max-w-md">
            <p className="text-sm font-bold uppercase tracking-[0.28em] text-primary">Ativação Offline</p>
            <h1 className="mt-4 font-headline text-5xl font-extrabold leading-tight text-on-surface">
              Licencie esta instalação antes do primeiro uso.
            </h1>
            <p className="mt-5 text-base leading-7 text-on-surface-variant">
              Copie o código desta instalação e use a chave recebida para liberar o sistema.
            </p>
          </div>
        </div>

        <div className="rounded-[2rem] bg-surface-container-lowest p-6 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-primary">Código da máquina</p>
          <p className="mt-3 break-all font-mono text-sm leading-6 text-on-surface">
            {machineFingerprint || 'Carregando...'}
          </p>
          <button type="button" onClick={copyFingerprint} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary">
            <Copy size={16} />
            Copiar código
          </button>
        </div>
      </div>

      <div className="flex items-center justify-center px-8 py-12">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
          className="w-full max-w-2xl rounded-[2.25rem] bg-surface-container-lowest p-10 shadow-xl"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-primary-container p-3 text-on-primary-container">
              <Key size={22} />
            </div>
            <div>
              <h2 className="font-headline text-3xl font-extrabold text-on-surface">Inserir licença</h2>
              <p className="text-sm text-on-surface-variant">
                A chave liberada será validada para este computador.
              </p>
            </div>
          </div>

          <textarea
            rows={6}
            value={licenseKey}
            onChange={(event) => setLicenseKey(event.target.value)}
            placeholder="Cole aqui a licença assinada"
            className="mt-8 w-full rounded-[1.5rem] bg-surface-container-low p-5 font-mono text-sm leading-6 text-on-surface outline-none ring-0 placeholder:text-outline"
          />

          {error ? (
            <p className="mt-4 text-sm font-semibold text-error">Licença inválida ou destinada a outra máquina.</p>
          ) : null}

          <div className="mt-8 flex justify-end">
            <button type="submit" disabled={loading || !licenseKey.trim()} className="satin-gradient rounded-xl px-8 py-4 text-sm font-bold text-on-primary shadow-lg disabled:cursor-not-allowed disabled:opacity-50">
              {loading ? 'Validando...' : 'Ativar instalação'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function LoginScreen({
  authService,
  onLogin,
}: {
  authService: IAuthService;
  onLogin: (user: AppUser) => void;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [mode, setMode] = useState<'checking' | 'setup' | 'login' | 'failed'>('checking');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const setup = mode === 'setup';

  useEffect(() => {
    let active = true;
    authService.hasUsers().then((exists) => {
      if (active) setMode(exists ? 'login' : 'setup');
    }).catch(() => {
      if (active) {
        setMode('failed');
        setError('Não foi possível verificar a conta local. Recarregue para tentar novamente.');
      }
    });
    return () => { active = false; };
  }, [authService]);

  const submit = async () => {
    if (mode !== 'setup' && mode !== 'login') return;
    if (setup && password !== confirmation) {
      setError('As senhas não coincidem. Digite a mesma senha nos dois campos.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const backendUser = setup
        ? await authService.register(email, password, displayName)
        : await authService.login(email, password);
      if (!backendUser) {
        if (setup && await authService.hasUsers()) {
          setMode('login');
          setError('Uma conta já foi criada neste dispositivo. Entre com ela.');
        } else {
          setError(setup ? 'Não foi possível criar a conta. Confira os dados e tente novamente.' : 'E-mail ou senha incorretos. Confira os dados e tente novamente.');
        }
        return;
      }
      onLogin({ uid: backendUser.uid, email: backendUser.email, displayName: backendUser.displayName });
    } catch (_error) {
      setError('Não foi possível acessar o armazenamento local. Use um navegador atualizado em localhost ou recarregue o aplicativo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-[34rem_1fr]">
      <div className="hidden flex-col justify-between bg-surface-container-low px-10 py-12 lg:flex">
        <div>
          <div className="flex items-center gap-3 text-primary">
            <div className="rounded-2xl bg-primary-container p-3 text-on-primary-container">
              <Building2 size={22} />
            </div>
            <div>
              <p className="font-headline text-2xl font-extrabold">{PRODUCT_NAME}</p>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-on-surface-variant">
                Sistema local da igreja
              </p>
            </div>
          </div>

          <div className="mt-16 max-w-md">
            <p className="text-sm font-bold uppercase tracking-[0.28em] text-primary">Acesso ao sistema</p>
            <h1 className="mt-4 font-headline text-5xl font-extrabold leading-tight text-on-surface">
              Controle membros, batismos e contribuições em um só lugar.
            </h1>
            <p className="mt-5 text-base leading-7 text-on-surface-variant">
              Crie seu acesso no primeiro uso. Os registros ficam neste computador.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-[2rem] bg-surface-container-lowest p-6 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-primary">Recursos principais</p>
            <div className="mt-4 space-y-3 text-sm text-on-surface-variant">
              <p>Cadastro de membros com dados básicos, nascimento e batismo.</p>
              <p>Controle de dizimistas e histórico de dízimos.</p>
              <p>Uso local com armazenamento neste computador.</p>
            </div>
          </div>

          <div className="rounded-[2rem] bg-surface-container-lowest p-6 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-primary">Créditos e suporte</p>
            <div className="mt-4 space-y-2 text-sm text-on-surface-variant">
              <p className="font-semibold text-on-surface">Criado por {AUTHOR_NAME}</p>
              <p className="break-all">
                Código aberto:{' '}
                <a href={SUPPORT_URL} className="font-semibold text-primary">
                  Problemas e sugestões
                </a>
              </p>
              <p>Envie sugestões e relate problemas no repositório público.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center px-4 py-8 sm:px-8 sm:py-12">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
          className="w-full max-w-xl rounded-2xl bg-surface-container-lowest p-6 shadow-xl sm:p-10"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-primary-container p-3 text-on-primary-container">
              <Lock size={22} />
            </div>
            <div>
              <h2 className="font-headline text-3xl font-extrabold text-on-surface">{setup ? 'Criar sua conta' : 'Entrar'}</h2>
              <p className="mt-2 text-sm text-on-surface-variant">{mode === 'checking' ? 'Verificando o acesso local...' : setup ? 'Primeiro acesso ao Gestão de Igrejas Open. Escolha os dados da sua conta.' : 'Use a conta criada neste dispositivo.'}</p>
            </div>
          </div>

          <div className="mt-8 space-y-6" aria-busy={loading || mode === 'checking'}>
            {setup ? (
              <label className="block">
                <span className="text-sm font-semibold text-on-surface-variant">Seu nome</span>
                <input value={displayName} onChange={(event) => setDisplayName(event.target.value)}
                  autoComplete="name" required maxLength={80} autoFocus
                  className="ghost-field mt-2 w-full rounded-t-xl bg-transparent px-0 py-4 text-base focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary" />
              </label>
            ) : null}
            <label className="block">
              <span className="text-sm font-semibold text-on-surface-variant">E-mail</span>
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoFocus={!setup}
                type="email"
                autoComplete="username" required maxLength={254}
                className="ghost-field mt-2 w-full rounded-t-xl bg-transparent px-0 py-4 text-base focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-on-surface-variant">Senha</span>
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                autoComplete={setup ? 'new-password' : 'current-password'} required
                minLength={setup ? 12 : undefined} maxLength={128}
                aria-describedby={setup ? 'password-help' : undefined}
                className="ghost-field mt-2 w-full rounded-t-xl bg-transparent px-0 py-4 text-base focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
              />
            </label>
            {setup ? (
              <>
                <p id="password-help" className="text-sm text-on-surface-variant">Use de 12 a 128 caracteres. Uma frase longa é uma boa opção.</p>
                <label className="block">
                  <span className="text-sm font-semibold text-on-surface-variant">Confirmar senha</span>
                  <input value={confirmation} onChange={(event) => setConfirmation(event.target.value)}
                    type="password" autoComplete="new-password" required minLength={12} maxLength={128}
                    className="ghost-field mt-2 w-full rounded-t-xl bg-transparent px-0 py-4 text-base focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary" />
                </label>
              </>
            ) : null}
          </div>

          {error ? (
            <p role="alert" className="mt-4 text-sm font-semibold text-error">{error}</p>
          ) : null}

          {mode === 'failed' ? <button type="button" onClick={() => window.location.reload()} className="mt-4 rounded-lg px-3 py-2 font-semibold text-primary focus-visible:outline-2">Tentar novamente</button> : null}
          <div className="mt-8 flex justify-end">
            <button type="submit" disabled={loading || mode === 'checking' || mode === 'failed' || !email || !password || (setup && (!displayName.trim() || password.length < 12 || !confirmation))} className="satin-gradient rounded-xl px-8 py-4 text-sm font-bold text-on-primary shadow-lg disabled:cursor-not-allowed disabled:opacity-50">
              {loading ? (setup ? 'Criando conta...' : 'Autenticando...') : setup ? 'Criar conta e acessar' : 'Entrar no sistema'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DashboardPage({
  members,
  tithes,
  userName,
  onCreateMember,
  onOpenTithes,
  onOpenMembers,
}: {
  members: Member[];
  tithes: Tithe[];
  userName: string;
  onCreateMember: () => void;
  onOpenTithes: () => void;
  onOpenMembers: () => void;
}) {
  const monthBuckets = getLastSixMonthBuckets();
  const monthlySeries = monthBuckets.map((bucket) => ({
    ...bucket,
    total: tithes
      .filter((tithe) => monthKey(tithe.contributionDate) === bucket.key)
      .reduce((sum, tithe) => sum + tithe.amount, 0),
  }));

  const maxSeriesValue = Math.max(...monthlySeries.map((item) => item.total), 1);
  const monthlyTithes = tithes
    .filter((tithe) => isCurrentMonth(tithe.contributionDate))
    .reduce((sum, tithe) => sum + tithe.amount, 0);
  const birthdaysThisMonth = members.filter((member) => isBirthdayInCurrentMonth(member.birthDate)).length;
  const pendingBaptisms = members.filter((member) => !member.baptismDate && member.status !== 'Inativo').length;
  const activeTithers = members.filter((member) => member.isTither && member.status === 'Ativo').length;
  const recentMembers = [...members]
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, 5);

  return (
    <div className="space-y-8">
      <section>
        <h1 className="font-headline text-5xl font-extrabold tracking-tight text-on-surface">
          Bem-vindo, {userName}.
        </h1>
        <p className="mt-3 max-w-3xl text-lg text-on-surface-variant">
          Acompanhe os principais registros da igreja e acesse rapidamente o cadastro de membros e o controle de contribuições.
        </p>
      </section>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total de Membros" value={String(members.length)} hint={`${activeTithers} dizimistas`} icon={Users} />
        <MetricCard label="Dízimos do Mês" value={formatCurrency(monthlyTithes)} hint="Mês atual" icon={Wallet} tone="secondary" />
        <MetricCard label="Batismos Pendentes" value={String(pendingBaptisms)} icon={Droplets} />
        <MetricCard label="Aniversariantes" value={String(birthdaysThisMonth)} icon={Cake} tone="error" />
      </div>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1.6fr)_22rem]">
        <section className="rounded-[2rem] bg-surface-container-low p-8 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="font-headline text-3xl font-bold text-on-surface">Tendência de Contribuição</h2>
              <p className="mt-2 text-sm text-on-surface-variant">Comparativo dos últimos seis meses de dízimos lançados.</p>
            </div>
            <div className="rounded-full bg-surface-container-lowest px-4 py-2 text-xs font-bold text-primary">
              Semestral
            </div>
          </div>

          {tithes.length === 0 ? (
            <div className="mt-12 rounded-[1.75rem] bg-surface-container-lowest p-10 text-center">
              <p className="font-headline text-2xl font-bold text-on-surface">Sem movimentações ainda</p>
              <p className="mt-3 text-sm text-on-surface-variant">
                Registre o primeiro dízimo para começar a acompanhar a saúde financeira da igreja.
              </p>
              <button type="button" onClick={onOpenTithes} className="satin-gradient mt-6 rounded-xl px-6 py-3 text-sm font-bold text-on-primary shadow-lg">
                Registrar primeiro dízimo
              </button>
            </div>
          ) : (
            <div className="mt-12">
              <div className="grid h-72 grid-cols-6 items-end gap-4">
                {monthlySeries.map((item) => (
                  <div key={item.key} className="flex h-full flex-col justify-end">
                    <div className="rounded-t-2xl bg-primary-container p-1">
                      <div
                        className="rounded-t-xl bg-primary"
                        style={{
                          height: `${Math.max((item.total / maxSeriesValue) * 180, item.total > 0 ? 26 : 8)}px`,
                        }}
                      />
                    </div>
                    <p className="mt-4 text-center text-xs font-bold tracking-[0.18em] text-on-surface-variant">
                      {item.label}
                    </p>
                    <p className="mt-2 text-center text-xs font-semibold text-on-surface">
                      {formatCurrency(item.total)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        <section className="space-y-6">
          <div className="overflow-hidden rounded-[2rem] bg-[radial-gradient(circle_at_top_left,_rgba(193,224,255,0.45),_transparent_42%),linear-gradient(140deg,#23313d_0%,#0c0f10_100%)] p-8 text-white shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-white/65">Palavra do dia</p>
            <p className="mt-6 font-headline text-3xl font-bold leading-tight">
              “O Senhor é o meu pastor; nada me faltará.”
            </p>
            <p className="mt-3 text-sm text-white/70">Salmo 23:1</p>
          </div>

          <div className="rounded-[2rem] bg-surface-container-low p-6 shadow-sm">
            <h3 className="font-headline text-2xl font-bold text-on-surface">Ações rápidas</h3>
            <div className="mt-6 space-y-3">
              <button type="button" onClick={onCreateMember} className="flex w-full items-center justify-between rounded-2xl bg-surface-container-lowest px-5 py-4 text-left shadow-sm transition-transform hover:translate-x-1">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-primary-container p-2 text-on-primary-container">
                    <Plus size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-on-surface">Registrar Novo Membro</p>
                    <p className="text-xs text-on-surface-variant">Abrir cadastro ministerial</p>
                  </div>
                </div>
                <ChevronRight size={18} className="text-on-surface-variant" />
              </button>

              <button type="button" onClick={onOpenTithes} className="flex w-full items-center justify-between rounded-2xl bg-surface-container-lowest px-5 py-4 text-left shadow-sm transition-transform hover:translate-x-1">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-secondary-container p-2 text-on-secondary-container">
                    <HandCoins size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-on-surface">Registrar Dízimo</p>
                    <p className="text-xs text-on-surface-variant">Lançar contribuição local</p>
                  </div>
                </div>
                <ChevronRight size={18} className="text-on-surface-variant" />
              </button>

              <button type="button" onClick={onOpenMembers} className="flex w-full items-center justify-between rounded-2xl bg-surface-container-lowest px-5 py-4 text-left shadow-sm transition-transform hover:translate-x-1">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-surface-container-high p-2 text-primary">
                    <Users size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-on-surface">Revisar Comunidade</p>
                    <p className="text-xs text-on-surface-variant">Abrir lista completa de membros</p>
                  </div>
                </div>
                <ChevronRight size={18} className="text-on-surface-variant" />
              </button>
            </div>
          </div>
        </section>
      </div>

      <section className="rounded-[2rem] bg-surface-container-lowest p-3 shadow-sm">
        <div className="flex items-center justify-between px-5 py-4">
          <div>
            <h2 className="font-headline text-2xl font-bold text-on-surface">Novos membros</h2>
            <p className="text-sm text-on-surface-variant">Entradas mais recentes no arquivo ministerial.</p>
          </div>
          <button type="button" onClick={onOpenMembers} className="text-sm font-bold text-primary">
            Ver todos
          </button>
        </div>

        {recentMembers.length === 0 ? (
          <div className="px-5 pb-8 text-sm text-on-surface-variant">Nenhum membro cadastrado até agora.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-surface-container-low text-xs font-bold uppercase tracking-[0.14em] text-primary">
                  <th className="rounded-tl-[1.4rem] px-5 py-4">Membro</th>
                  <th className="px-5 py-4">Nascimento</th>
                  <th className="px-5 py-4">Batismo</th>
                  <th className="px-5 py-4">Perfil</th>
                  <th className="rounded-tr-[1.4rem] px-5 py-4">Situação</th>
                </tr>
              </thead>
              <tbody>
                {recentMembers.map((member) => (
                  <tr key={member.id} className="hover:bg-surface-container-low">
                    <td className="px-5 py-5">
                      <div className="flex items-center gap-4">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-container font-bold text-on-primary-container">
                          {getInitials(member.fullName)}
                        </div>
                        <div>
                          <p className="font-headline text-lg font-semibold text-on-surface">{member.fullName}</p>
                          <p className="text-xs font-medium text-on-surface-variant">{member.email || 'Sem e-mail cadastrado'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-5 text-sm font-medium text-on-surface-variant">{formatDate(member.birthDate)}</td>
                    <td className="px-5 py-5 text-sm font-medium text-on-surface-variant">{formatDate(member.baptismDate)}</td>
                    <td className="px-5 py-5">
                      <span className={cn('inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold', member.isTither ? 'bg-secondary-container text-on-secondary-container' : 'bg-surface-container-low text-on-surface-variant')}>
                        <span className={cn('h-2 w-2 rounded-full', member.isTither ? 'bg-primary' : 'bg-outline')} />
                        {member.isTither ? 'Dizimista' : 'Não dizimista'}
                      </span>
                    </td>
                    <td className="px-5 py-5">
                      <span className={cn('inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold', member.status === 'Ativo' ? 'bg-secondary-container text-on-secondary-container' : member.status === 'Visitante' ? 'bg-primary-container text-on-primary-container' : 'bg-surface-container-low text-on-surface-variant')}>
                        <span className={cn('h-2 w-2 rounded-full', member.status === 'Ativo' ? 'bg-primary' : member.status === 'Visitante' ? 'bg-secondary' : 'bg-outline')} />
                        {member.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function MembersPage({
  members,
  search,
  onSearchChange,
  onCreate,
  onEdit,
  onDelete,
}: {
  members: Member[];
  search: string;
  onSearchChange: (value: string) => void;
  onCreate: () => void;
  onEdit: (member: Member) => void;
  onDelete: (member: Member) => void;
}) {
  const filteredMembers = members.filter((member) => {
    const haystack = [
      member.fullName,
      member.email,
      member.phone,
      member.address,
      member.status,
      member.isTither ? 'dizimista' : 'nao dizimista',
    ]
      .join(' ')
      .toLowerCase();

    return haystack.includes(search.toLowerCase());
  });

  const newMembersInMonth = members.filter((member) => isCurrentMonth(member.createdAt)).length;
  const birthdaysThisMonth = members.filter((member) => isBirthdayInCurrentMonth(member.birthDate)).length;
  const pendingBaptisms = members.filter((member) => !member.baptismDate && member.status !== 'Inativo').length;

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.24em] text-primary">Membros</p>
          <h1 className="mt-3 font-headline text-5xl font-extrabold tracking-tight text-on-surface">
            Registro de Comunidade
          </h1>
          <p className="mt-3 max-w-3xl text-lg text-on-surface-variant">
            Gerencie o corpo ministerial com foco em cadastro civil, batismo e acompanhamento de dizimistas.
          </p>
        </div>
        <button type="button" onClick={onCreate} className="satin-gradient inline-flex items-center gap-3 rounded-xl px-8 py-4 text-sm font-bold text-on-primary shadow-lg">
          <Plus size={18} />
          Novo Cadastro
        </button>
      </section>

      <section className="rounded-[2rem] bg-surface-container-lowest p-3 shadow-sm">
        <div className="px-5 py-4">
          <label className="relative z-10 block">
            <Search
              size={18}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-outline"
            />
            <input
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              type="search"
              placeholder="Buscar arquivamento..."
              className="w-full rounded-full bg-surface-container-high px-12 py-3 text-sm text-on-surface outline-none placeholder:text-outline"
            />
          </label>
        </div>

        {filteredMembers.length === 0 ? (
          <div className="px-5 pb-8">
            <EmptyPanel
              title={members.length === 0 ? 'Nenhum membro cadastrado' : 'Nenhum resultado encontrado'}
              description={
                members.length === 0
                  ? 'Crie o primeiro cadastro para começar a organizar os registros da igreja.'
                  : 'Ajuste a busca ou registre um novo membro.'
              }
              actionLabel="Abrir cadastro"
              onAction={onCreate}
            />
          </div>
        ) : (
          <div className="overflow-x-auto px-2 pb-3">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-surface-container-low text-xs font-bold uppercase tracking-[0.14em] text-primary">
                  <th className="rounded-tl-[1.6rem] px-6 py-5">Membro</th>
                  <th className="px-6 py-5">Data de Nascimento</th>
                  <th className="px-6 py-5">Data de Batismo</th>
                  <th className="px-6 py-5">Status</th>
                  <th className="px-6 py-5">Dizimista</th>
                  <th className="rounded-tr-[1.6rem] px-6 py-5">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredMembers.map((member) => (
                  <tr key={member.id} className="group hover:bg-surface-container-low">
                    <td className="px-6 py-6">
                      <div className="flex items-center gap-4">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-container font-bold text-on-primary-container">
                          {getInitials(member.fullName)}
                        </div>
                        <div>
                          <p className="font-headline text-lg font-semibold text-on-surface">{member.fullName}</p>
                          <p className="text-xs font-medium text-on-surface-variant">
                            {member.email || 'Sem e-mail'} {member.phone ? `• ${member.phone}` : ''}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-6 text-sm font-medium text-on-surface-variant">{formatDate(member.birthDate)}</td>
                    <td className="px-6 py-6 text-sm font-medium text-on-surface-variant">{formatDate(member.baptismDate)}</td>
                    <td className="px-6 py-6">
                      <span className={cn('inline-flex items-center gap-2 rounded-md px-3 py-1 text-xs font-bold', member.status === 'Ativo' ? 'bg-secondary-container text-on-secondary-container' : member.status === 'Visitante' ? 'bg-primary-container text-on-primary-container' : 'bg-surface-container-low text-on-surface-variant')}>
                        <span className={cn('h-1.5 w-1.5 rounded-full', member.status === 'Ativo' ? 'bg-primary' : member.status === 'Visitante' ? 'bg-secondary' : 'bg-outline')} />
                        {member.status}
                      </span>
                    </td>
                    <td className="px-6 py-6">
                      <span className={cn('inline-flex items-center gap-2 rounded-md px-3 py-1 text-xs font-bold', member.isTither ? 'bg-primary-container text-on-primary-container' : 'bg-surface-container-low text-on-surface-variant')}>
                        <span className={cn('h-1.5 w-1.5 rounded-full', member.isTither ? 'bg-primary' : 'bg-outline')} />
                        {member.isTither ? 'Sim' : 'Não'}
                      </span>
                    </td>
                    <td className="px-6 py-6">
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => onEdit(member)} className="rounded-lg bg-surface-container-low p-2 text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-primary">
                          <Pencil size={16} />
                        </button>
                        <button type="button" onClick={() => onDelete(member)} className="rounded-lg bg-surface-container-low p-2 text-on-surface-variant transition-colors hover:bg-error-container/15 hover:text-error">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="rounded-[1.75rem] bg-surface-container-low p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary-container p-3 text-on-primary-container">
              <TrendingUp size={18} />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-on-surface-variant">Cadastros do mês</p>
              <p className="mt-1 font-headline text-3xl font-extrabold text-primary">+{newMembersInMonth}</p>
            </div>
          </div>
        </div>
        <div className="rounded-[1.75rem] bg-surface-container-low p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-error-container/20 p-3 text-error">
              <Cake size={18} />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-on-surface-variant">Aniversariantes</p>
              <p className="mt-1 font-headline text-3xl font-extrabold text-on-surface">{birthdaysThisMonth}</p>
            </div>
          </div>
        </div>
        <div className="rounded-[1.75rem] bg-surface-container-low p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-secondary-container p-3 text-on-secondary-container">
              <Droplets size={18} />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-on-surface-variant">Batismos pendentes</p>
              <p className="mt-1 font-headline text-3xl font-extrabold text-on-surface">{pendingBaptisms}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MemberFormPage({
  form,
  editing,
  onChange,
  onCancel,
  onSubmit,
  saving,
}: {
  form: MemberFormState;
  editing: boolean;
  onChange: (field: keyof MemberFormState, value: string | boolean) => void;
  onCancel: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  saving: boolean;
}) {
  const nameInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const focusTimer = window.setTimeout(() => {
      nameInputRef.current?.focus();
    }, 60);

    return () => window.clearTimeout(focusTimer);
  }, [editing]);

  return (
    <div className="space-y-8">
      <section>
        <p className="text-sm font-bold uppercase tracking-[0.24em] text-primary">
          {editing ? 'Editar membro' : 'Novo membro'}
        </p>
        <h1 className="mt-3 font-headline text-5xl font-extrabold tracking-tight text-on-surface">
          Cadastro Ministerial
        </h1>
        <p className="mt-3 max-w-3xl text-lg text-on-surface-variant">
          Registre os dados civis e ministeriais com clareza para manter o cadastro da igreja sempre atualizado.
        </p>
      </section>

      <form
        onSubmit={onSubmit}
        className="relative z-10 rounded-[2rem] bg-surface-container-lowest p-8 shadow-sm md:p-12"
      >
        <div className="space-y-12">
          <section>
            <div className="mb-8 flex items-center gap-3">
              <div className="rounded-xl bg-primary-container p-3 text-on-primary-container">
                <Users size={18} />
              </div>
              <h2 className="font-headline text-2xl font-bold text-on-surface">Identificação Civil</h2>
            </div>

            <div className="grid gap-x-12 gap-y-8 md:grid-cols-2">
              <label className="block md:col-span-2">
                <span className="text-xs font-bold uppercase tracking-[0.18em] text-outline">Nome Completo</span>
                <input
                  ref={nameInputRef}
                  value={form.fullName}
                  onChange={(event) => onChange('fullName', event.target.value)}
                  autoFocus
                  className="ghost-field mt-2 w-full bg-transparent px-0 py-4 text-base outline-none placeholder:text-outline"
                  placeholder="Ex: Gabriel Arcanjo da Silva"
                  type="text"
                />
                <p className="mt-2 text-xs font-medium text-on-surface-variant">
                  Campo obrigatório para salvar o cadastro.
                </p>
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.18em] text-outline">E-mail</span>
                <input
                  value={form.email}
                  onChange={(event) => onChange('email', event.target.value)}
                  className="ghost-field mt-2 w-full bg-transparent px-0 py-4 text-base outline-none placeholder:text-outline"
                  placeholder="nome@igreja.org"
                  type="email"
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.18em] text-outline">Telefone</span>
                <input
                  value={form.phone}
                  onChange={(event) => onChange('phone', event.target.value)}
                  className="ghost-field mt-2 w-full bg-transparent px-0 py-4 text-base outline-none placeholder:text-outline"
                  placeholder="(00) 00000-0000"
                  type="tel"
                />
              </label>

              <label className="block md:col-span-2">
                <span className="text-xs font-bold uppercase tracking-[0.18em] text-outline">Endereço Residencial</span>
                <input
                  value={form.address}
                  onChange={(event) => onChange('address', event.target.value)}
                  className="ghost-field mt-2 w-full bg-transparent px-0 py-4 text-base outline-none placeholder:text-outline"
                  placeholder="Rua, número, bairro, cidade"
                  type="text"
                />
              </label>
            </div>
          </section>

          <section className="pt-4">
            <div className="mb-8 flex items-center gap-3">
              <div className="rounded-xl bg-secondary-container p-3 text-on-secondary-container">
                <CalendarDays size={18} />
              </div>
              <h2 className="font-headline text-2xl font-bold text-on-surface">Marcos Temporais</h2>
            </div>

            <div className="grid gap-x-12 gap-y-8 md:grid-cols-2">
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.18em] text-outline">Data de Nascimento</span>
                <input
                  value={form.birthDate}
                  onChange={(event) => onChange('birthDate', event.target.value)}
                  className="ghost-field mt-2 w-full bg-transparent px-0 py-4 text-base outline-none"
                  type="date"
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.18em] text-outline">Data de Batismo</span>
                <input
                  value={form.baptismDate}
                  onChange={(event) => onChange('baptismDate', event.target.value)}
                  className="ghost-field mt-2 w-full bg-transparent px-0 py-4 text-base outline-none"
                  type="date"
                />
              </label>
            </div>
          </section>

          <section className="pt-4">
            <div className="mb-8 flex items-center gap-3">
              <div className="rounded-xl bg-surface-container-high p-3 text-primary">
                <ShieldCheck size={18} />
              </div>
              <h2 className="font-headline text-2xl font-bold text-on-surface">Situação Ministerial</h2>
            </div>

            <div className="grid gap-x-12 gap-y-8 md:grid-cols-2">
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.18em] text-outline">Status</span>
                <select
                  value={form.status}
                  onChange={(event) => onChange('status', event.target.value)}
                  className="ghost-field mt-2 w-full bg-transparent px-0 py-4 text-base outline-none"
                >
                  {memberStatuses.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex items-end">
                <div className="flex w-full items-center justify-between rounded-2xl bg-surface-container-low p-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-outline">Perfil Financeiro</p>
                    <p className="mt-2 text-sm text-on-surface">Membro contribui regularmente com dízimos.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onChange('isTither', !form.isTither)}
                    className={cn(
                      'relative inline-flex h-8 w-16 items-center rounded-full transition-colors',
                      form.isTither ? 'bg-primary' : 'bg-surface-container-highest',
                    )}
                  >
                    <span
                      className={cn(
                        'inline-block h-6 w-6 transform rounded-full bg-white transition-transform',
                        form.isTither ? 'translate-x-9' : 'translate-x-1',
                      )}
                    />
                  </button>
                </div>
              </label>

              <label className="block md:col-span-2">
                <span className="text-xs font-bold uppercase tracking-[0.18em] text-outline">Observações</span>
                <textarea
                  value={form.notes}
                  onChange={(event) => onChange('notes', event.target.value)}
                  rows={4}
                  className="ghost-field mt-2 w-full resize-none bg-transparent px-0 py-4 text-base outline-none placeholder:text-outline"
                  placeholder="Ministério, função, observações pastorais ou informações úteis."
                />
              </label>
            </div>
          </section>
        </div>

        <div className="mt-12 flex items-center justify-end gap-4">
          <button type="button" onClick={onCancel} className="text-sm font-bold text-primary">
            Cancelar
          </button>
          <button type="submit" disabled={saving || !form.fullName.trim()} className="satin-gradient inline-flex items-center gap-2 rounded-xl px-8 py-4 text-sm font-bold text-on-primary shadow-lg disabled:cursor-not-allowed disabled:opacity-50">
            <Save size={18} />
            {saving ? 'Salvando...' : editing ? 'Salvar Alterações' : 'Salvar Cadastro'}
          </button>
        </div>
      </form>

      <p className="text-center text-sm text-on-surface-variant">
        Os registros ficam salvos neste computador para consulta local da igreja.
      </p>
    </div>
  );
}

function TithesPage({
  members,
  tithes,
  form,
  search,
  onSearchChange,
  onFormChange,
  onSubmit,
  onDelete,
  onExport,
  saving,
}: {
  members: Member[];
  tithes: Tithe[];
  form: TitheFormState;
  search: string;
  onSearchChange: (value: string) => void;
  onFormChange: (field: keyof TitheFormState, value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onDelete: (tithe: Tithe) => void;
  onExport: () => void;
  saving: boolean;
}) {
  const filteredTithes = tithes.filter((tithe) => {
    const haystack = [
      tithe.memberName,
      tithe.paymentMethod,
      tithe.status,
      tithe.notes,
      String(tithe.amount),
    ]
      .join(' ')
      .toLowerCase();

    return haystack.includes(search.toLowerCase());
  });

  const monthlyTotal = tithes
    .filter((tithe) => isCurrentMonth(tithe.contributionDate))
    .reduce((sum, tithe) => sum + tithe.amount, 0);
  const contributors = new Set(tithes.map((tithe) => tithe.memberId || tithe.memberName).filter(Boolean)).size;
  const currentMonthCount = tithes.filter((tithe) => isCurrentMonth(tithe.contributionDate)).length;

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="font-headline text-5xl font-extrabold tracking-tight text-primary">Dízimos e Ofertas</h1>
          <p className="mt-3 max-w-3xl text-lg text-on-surface-variant">
            Registre e acompanhe as contribuições com histórico local e consulta rápida.
          </p>
        </div>
        <div className="w-fit rounded-full bg-surface-container-low px-6 py-3">
          <p className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-on-surface-variant">Saldo mensal</p>
          <p className="mt-1 font-headline text-3xl font-extrabold text-primary">{formatCurrency(monthlyTotal)}</p>
        </div>
      </section>

      <div className="grid gap-8 xl:grid-cols-[minmax(21rem,24rem)_minmax(0,1fr)]">
        <section className="space-y-6">
          <form onSubmit={onSubmit} className="rounded-[2rem] bg-surface-container-lowest p-8 shadow-sm">
            <div className="mb-8 flex items-center gap-3">
              <div className="rounded-xl bg-primary-container p-3 text-on-primary-container">
                <Wallet size={18} />
              </div>
              <h2 className="font-headline text-2xl font-bold text-on-surface">Registrar Entrada</h2>
            </div>

            <div className="space-y-6">
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.18em] text-outline">Nome do Dizimista</span>
                <select
                  value={form.memberId}
                  onChange={(event) => onFormChange('memberId', event.target.value)}
                  className="mt-2 w-full rounded-xl bg-surface-container-high px-4 py-4 text-sm outline-none"
                >
                  <option value="">Selecione um membro</option>
                  {members
                    .filter((member) => member.status !== 'Inativo')
                    .map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.fullName}
                      </option>
                    ))}
                </select>
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-[0.18em] text-outline">Valor</span>
                  <input
                    value={form.amount}
                    onChange={(event) => onFormChange('amount', event.target.value)}
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0,00"
                    className="mt-2 w-full rounded-xl bg-surface-container-high px-4 py-4 text-sm outline-none"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-[0.18em] text-outline">Data</span>
                  <input
                    value={form.contributionDate}
                    onChange={(event) => onFormChange('contributionDate', event.target.value)}
                    type="date"
                    className="mt-2 w-full rounded-xl bg-surface-container-high px-4 py-4 text-sm outline-none"
                  />
                </label>
              </div>

              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.18em] text-outline">Forma de Pagamento</span>
                <select
                  value={form.paymentMethod}
                  onChange={(event) => onFormChange('paymentMethod', event.target.value)}
                  className="mt-2 w-full rounded-xl bg-surface-container-high px-4 py-4 text-sm outline-none"
                >
                  {paymentMethods.map((method) => (
                    <option key={method} value={method}>
                      {method}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.18em] text-outline">Situação do Lançamento</span>
                <select
                  value={form.status}
                  onChange={(event) => onFormChange('status', event.target.value)}
                  className="mt-2 w-full rounded-xl bg-surface-container-high px-4 py-4 text-sm outline-none"
                >
                  <option value="Confirmado">Confirmado</option>
                  <option value="Pendente">Pendente</option>
                </select>
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.18em] text-outline">Observações</span>
                <textarea
                  value={form.notes}
                  onChange={(event) => onFormChange('notes', event.target.value)}
                  rows={4}
                  placeholder="Ex: dízimo de abril, oferta missionária, acerto retroativo."
                  className="mt-2 w-full resize-none rounded-xl bg-surface-container-high px-4 py-4 text-sm outline-none placeholder:text-outline"
                />
              </label>

              <button type="submit" disabled={saving || !form.memberId || !form.amount} className="satin-gradient w-full rounded-xl px-6 py-4 text-sm font-bold text-on-primary shadow-lg disabled:cursor-not-allowed disabled:opacity-50">
                {saving ? 'Salvando...' : 'Confirmar Recebimento'}
              </button>
            </div>
          </form>

          <div className="overflow-hidden rounded-[2rem] bg-[linear-gradient(140deg,#385670_0%,#c1e0ff_55%,#385670_100%)] p-6 text-white shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-white/70">Citação do dia</p>
            <p className="mt-6 font-headline text-2xl font-bold leading-tight">
              “Cada um dê conforme determinou em seu coração, não com pesar ou por obrigação.”
            </p>
            <p className="mt-4 text-sm text-white/80">2 Coríntios 9:7</p>
          </div>
        </section>

        <section className="min-w-0 rounded-[2rem] bg-surface-container-low p-6 shadow-sm lg:p-8">
          <div className="mb-8 flex min-w-0 flex-col gap-4 2xl:flex-row 2xl:items-center 2xl:justify-between">
            <div className="min-w-0">
              <h2 className="font-headline text-3xl font-bold text-on-surface">Contribuições Recentes</h2>
              <p className="mt-2 text-sm text-on-surface-variant">Histórico local das entradas registradas.</p>
            </div>
            <div className="flex w-full flex-col gap-3 md:flex-row md:flex-wrap md:items-center 2xl:w-auto 2xl:max-w-[26rem] 2xl:flex-nowrap">
              <label className="relative z-10 min-w-0 w-full md:flex-1 2xl:min-w-[18rem]">
                <Search
                  size={18}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-outline"
                />
                <input
                  value={search}
                  onChange={(event) => onSearchChange(event.target.value)}
                  type="search"
                  placeholder="Buscar contribuição..."
                  className="w-full rounded-full bg-surface-container-lowest px-12 py-3 text-sm outline-none placeholder:text-outline"
                />
              </label>
              <button
                type="button"
                onClick={onExport}
                className="w-full shrink-0 rounded-xl bg-surface-container-lowest px-4 py-3 text-sm font-bold text-primary shadow-sm md:w-auto"
              >
                Exportar CSV
              </button>
            </div>
          </div>

          {filteredTithes.length === 0 ? (
            <EmptyPanel
              title={tithes.length === 0 ? 'Nenhum dízimo registrado' : 'Nenhum resultado encontrado'}
              description={
                tithes.length === 0
                  ? 'Use o formulário lateral para registrar a primeira contribuição.'
                  : 'A busca atual não encontrou contribuições correspondentes.'
              }
            />
          ) : (
            <div className="space-y-4">
              {filteredTithes.map((tithe) => (
                <div key={tithe.id} className="rounded-[1.5rem] bg-surface-container-lowest p-5 shadow-sm">
                  <div className="flex flex-col gap-5 2xl:grid 2xl:grid-cols-[minmax(0,1.8fr)_140px_130px_140px_120px_56px] 2xl:items-center">
                    <div className="min-w-0 flex items-center gap-4">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-container text-sm font-bold text-on-primary-container">
                        {getInitials(tithe.memberName)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-headline text-xl font-semibold text-on-surface">{tithe.memberName}</p>
                        <p className="truncate text-xs font-medium text-on-surface-variant">
                          {tithe.notes || 'Contribuição registrada'}
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:contents">
                      <div>
                        <p className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-on-surface-variant 2xl:hidden">
                          Valor
                        </p>
                        <p className="text-lg font-bold text-primary">{formatCurrency(tithe.amount)}</p>
                      </div>
                      <div>
                        <p className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-on-surface-variant 2xl:hidden">
                          Data
                        </p>
                        <p className="text-sm font-medium text-on-surface-variant">
                          {formatDate(tithe.contributionDate)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-on-surface-variant 2xl:hidden">
                          Forma
                        </p>
                        <div className="flex items-center gap-2 text-sm font-semibold text-on-surface">
                          {tithe.paymentMethod === 'PIX' ? <Landmark size={16} /> : tithe.paymentMethod === 'Cartão' ? <CreditCard size={16} /> : <Wallet size={16} />}
                          {tithe.paymentMethod}
                        </div>
                      </div>
                      <div>
                        <p className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-on-surface-variant 2xl:hidden">
                          Situação
                        </p>
                        <span className={cn('inline-flex items-center justify-center rounded-md px-3 py-1 text-xs font-bold', tithe.status === 'Confirmado' ? 'bg-secondary-container text-on-secondary-container' : 'bg-surface-container-high text-on-surface-variant')}>
                          {tithe.status}
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-end 2xl:block">
                      <button type="button" onClick={() => onDelete(tithe)} className="rounded-lg bg-surface-container-low p-2 text-on-surface-variant transition-colors hover:bg-error-container/15 hover:text-error">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="rounded-[1.75rem] bg-surface-container-low p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary-container p-3 text-on-primary-container">
              <TrendingUp size={18} />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-on-surface-variant">Lançamentos no mês</p>
              <p className="mt-1 font-headline text-3xl font-extrabold text-on-surface">{currentMonthCount}</p>
            </div>
          </div>
        </div>
        <div className="rounded-[1.75rem] bg-surface-container-low p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-secondary-container p-3 text-on-secondary-container">
              <Users size={18} />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-on-surface-variant">Contribuintes ativos</p>
              <p className="mt-1 font-headline text-3xl font-extrabold text-on-surface">{contributors}</p>
            </div>
          </div>
        </div>
        <div className="rounded-[1.75rem] bg-surface-container-low p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-error-container/20 p-3 text-error">
              <CheckCircle2 size={18} />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-on-surface-variant">Resumo fiscal</p>
              <p className="mt-1 text-sm font-semibold text-primary">Exportação disponível em CSV</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [view, setView] = useState<AppView>('dashboard');
  const [activated, setActivated] = useState(false);
  const [booting, setBooting] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [notice, setNotice] = useState<NoticeState | null>(null);

  const [members, setMembers] = useState<Member[]>([]);
  const [tithes, setTithes] = useState<Tithe[]>([]);

  const [memberSearch, setMemberSearch] = useState('');
  const [titheSearch, setTitheSearch] = useState('');

  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [memberForm, setMemberForm] = useState<MemberFormState>(emptyMemberForm());
  const [memberSaving, setMemberSaving] = useState(false);

  const [titheForm, setTitheForm] = useState<TitheFormState>(emptyTitheForm());
  const [titheSaving, setTitheSaving] = useState(false);
  const runtimeIsDesktop = isDesktopShell();
  const electronBridgeAvailable = hasElectronBridge();
  const servicesRef = useRef<AppServices | null>(null);

  if (!servicesRef.current && (!runtimeIsDesktop || electronBridgeAvailable)) {
    servicesRef.current = {
      authService: createAuthService(),
      memberRepo: createRepository<Member>('members'),
      titheRepo: createRepository<Tithe>('tithes'),
    };
  }

  const authService = servicesRef.current?.authService ?? null;
  const memberRepo = servicesRef.current?.memberRepo ?? null;
  const titheRepo = servicesRef.current?.titheRepo ?? null;

  function showNotice(title: string, message: string, tone: NoticeTone = 'success') {
    setNotice({
      id: Date.now(),
      title,
      message,
      tone,
    });
  }

  useEffect(() => {
    if (!notice) {
      return;
    }

    const timer = window.setTimeout(() => {
      setNotice((current) => (current?.id === notice.id ? null : current));
    }, 4200);

    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    if (runtimeIsDesktop && !electronBridgeAvailable) {
      setBooting(false);
      return;
    }

    if (!authService) {
      setBooting(false);
      return;
    }

    let active = true;
    const unsubscribe = authService.onAuthStateChanged((nextUser) => {
      if (active) {
        setUser(nextUser);
      }
    });

    const bootstrap = async () => {
      if (typeof window === 'undefined' || !window.electronAPI) {
        setActivated(true);
        setBooting(false);
        return;
      }

      try {
        const isActivated = true; // Open edition requires no commercial activation.
        if (active) {
          setActivated(isActivated);
        }
      } catch (_error) {
        if (active) {
          setActivated(false);
          showNotice(
            'Ativação indisponível',
            'Não foi possível validar a licença desta instalação no momento.',
            'error',
          );
        }
      } finally {
        if (active) {
          setBooting(false);
        }
      }
    };

    void bootstrap();

    return () => {
      active = false;
      unsubscribe();
    };
  }, [authService, electronBridgeAvailable, runtimeIsDesktop]);

  useEffect(() => {
    if (!activated || !user || !memberRepo || !titheRepo) {
      return;
    }

    void refreshData({ silent: false });
  }, [activated, user, memberRepo, titheRepo]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [view]);

  async function refreshData({ silent = true }: { silent?: boolean } = {}) {
    if (!memberRepo || !titheRepo) {
      return;
    }

    setLoadingData(true);
    try {
      const [memberRows, titheRows] = await Promise.all([memberRepo.getAll(), titheRepo.getAll()]);

      setMembers(
        memberRows
          .map((row) => normalizeMember(row as Member & Record<string, unknown>))
          .sort((left, right) => left.fullName.localeCompare(right.fullName, 'pt-BR')),
      );
      setTithes(
        titheRows
          .map((row) => normalizeTithe(row as Tithe & Record<string, unknown>))
          .sort((left, right) => {
            const dateCompare = right.contributionDate.localeCompare(left.contributionDate);
            return dateCompare !== 0 ? dateCompare : right.createdAt.localeCompare(left.createdAt);
          }),
      );
    } catch (error) {
      console.error('Falha ao carregar dados do sistema:', error);
      if (!silent) {
        showNotice(
          'Não foi possível carregar os registros',
          'Verifique esta instalação e tente novamente.',
          'error',
        );
      }
    } finally {
      setLoadingData(false);
    }
  }

  function startNewMember() {
    setEditingMemberId(null);
    setMemberForm(emptyMemberForm());
    setView('member-form');
  }

  function editMember(member: Member) {
    setEditingMemberId(member.id);
    setMemberForm({
      fullName: member.fullName,
      email: member.email,
      phone: member.phone,
      address: member.address,
      birthDate: member.birthDate,
      baptismDate: member.baptismDate,
      status: member.status,
      isTither: member.isTither,
      notes: member.notes,
    });
    setView('member-form');
  }

  async function saveMember(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!memberRepo || !titheRepo) {
      showNotice(
        'Cadastro indisponível',
        'Os recursos locais do sistema não estão prontos para salvar este membro.',
        'error',
      );
      return;
    }

    if (!memberForm.fullName.trim()) {
      showNotice('Nome obrigatório', 'Informe o nome completo do membro para continuar.', 'error');
      return;
    }

    setMemberSaving(true);

    try {
      const payload = {
        fullName: memberForm.fullName.trim(),
        email: memberForm.email.trim(),
        phone: memberForm.phone.trim(),
        address: memberForm.address.trim(),
        birthDate: memberForm.birthDate,
        baptismDate: memberForm.baptismDate,
        status: memberForm.status,
        isTither: memberForm.isTither,
        notes: memberForm.notes.trim(),
        createdAt: editingMemberId
          ? members.find((member) => member.id === editingMemberId)?.createdAt || todayIso()
          : todayIso(),
      };

      if (editingMemberId) {
        const previousMember = members.find((member) => member.id === editingMemberId);
        await memberRepo.update(editingMemberId, payload);

        if (previousMember && previousMember.fullName !== payload.fullName) {
          await Promise.all(
            tithes
              .filter((tithe) => tithe.memberId === editingMemberId)
              .map((tithe) => titheRepo.update(tithe.id, { memberName: payload.fullName })),
          );
        }
      } else {
        await memberRepo.add(payload);
      }

      await refreshData({ silent: true });
      setView('members');
      setMemberForm(emptyMemberForm());
      setEditingMemberId(null);
      showNotice(
        editingMemberId ? 'Cadastro atualizado' : 'Membro cadastrado',
        `${payload.fullName} foi salvo com sucesso.`,
        'success',
      );
    } catch (error) {
      console.error('Falha ao salvar membro:', error);
      showNotice(
        'Não foi possível salvar o cadastro',
        'Revise os dados informados e tente novamente.',
        'error',
      );
    } finally {
      setMemberSaving(false);
    }
  }

  async function deleteMember(member: Member) {
    if (!memberRepo) {
      showNotice(
        'Exclusão indisponível',
        'Os recursos locais do sistema não estão prontos para esta ação.',
        'error',
      );
      return;
    }

    const confirmed = window.confirm(`Excluir o cadastro de ${member.fullName}?`);
    if (!confirmed) {
      return;
    }

    try {
      await memberRepo.delete(member.id);
      await refreshData({ silent: true });
      showNotice('Cadastro removido', `${member.fullName} foi removido com sucesso.`, 'success');
    } catch (error) {
      console.error('Falha ao excluir membro:', error);
      showNotice(
        'Não foi possível excluir o cadastro',
        'Tente novamente em alguns instantes.',
        'error',
      );
    }
  }

  async function saveTithe(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!titheRepo) {
      showNotice(
        'Lançamento indisponível',
        'Os recursos locais do sistema não estão prontos para salvar este registro.',
        'error',
      );
      return;
    }

    if (!titheForm.memberId || !titheForm.amount) {
      showNotice(
        'Dados incompletos',
        'Selecione um membro e informe o valor da contribuição.',
        'error',
      );
      return;
    }

    const selectedMember = members.find((member) => member.id === titheForm.memberId);
    if (!selectedMember) {
      showNotice('Membro não encontrado', 'Selecione novamente o membro desta contribuição.', 'error');
      return;
    }

    const parsedAmount = Number(titheForm.amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      showNotice('Valor inválido', 'Informe um valor maior que zero para continuar.', 'error');
      return;
    }

    setTitheSaving(true);

    try {
      await titheRepo.add({
        memberId: selectedMember.id,
        memberName: selectedMember.fullName,
        amount: parsedAmount,
        paymentMethod: titheForm.paymentMethod,
        contributionDate: titheForm.contributionDate,
        status: titheForm.status,
        notes: titheForm.notes.trim(),
        createdAt: todayIso(),
      });

      setTitheForm(emptyTitheForm());
      await refreshData({ silent: true });
      setView('tithes');
      showNotice(
        'Contribuição registrada',
        `O lançamento de ${selectedMember.fullName} foi salvo com sucesso.`,
        'success',
      );
    } catch (error) {
      console.error('Falha ao salvar contribuição:', error);
      showNotice(
        'Não foi possível registrar a contribuição',
        'Revise os dados informados e tente novamente.',
        'error',
      );
    } finally {
      setTitheSaving(false);
    }
  }

  async function deleteTithe(tithe: Tithe) {
    if (!titheRepo) {
      showNotice(
        'Exclusão indisponível',
        'Os recursos locais do sistema não estão prontos para esta ação.',
        'error',
      );
      return;
    }

    const confirmed = window.confirm(`Excluir o lançamento de ${tithe.memberName}?`);
    if (!confirmed) {
      return;
    }

    try {
      await titheRepo.delete(tithe.id);
      await refreshData({ silent: true });
      showNotice('Lançamento removido', 'A contribuição foi removida com sucesso.', 'success');
    } catch (error) {
      console.error('Falha ao excluir contribuição:', error);
      showNotice(
        'Não foi possível excluir o lançamento',
        'Tente novamente em alguns instantes.',
        'error',
      );
    }
  }

  function exportTithes() {
    if (tithes.length === 0) {
      showNotice(
        'Nada para exportar',
        'Cadastre ao menos uma contribuição antes de gerar o relatório.',
        'info',
      );
      return;
    }

    const rows = [
      ['Membro', 'Valor', 'Data', 'Forma', 'Status', 'Observações'].join(';'),
      ...tithes.map((tithe) =>
        [
          `"${tithe.memberName}"`,
          tithe.amount.toFixed(2).replace('.', ','),
          tithe.contributionDate,
          tithe.paymentMethod,
          tithe.status,
          `"${tithe.notes.replace(/"/g, '""')}"`,
        ].join(';'),
      ),
    ];

    downloadCsv(`dizimos-${todayIso()}.csv`, rows.join('\n'));
    showNotice(
      'Relatório exportado',
      'O arquivo CSV das contribuições foi gerado com sucesso.',
      'success',
    );
  }

  function updateMemberForm(field: keyof MemberFormState, value: string | boolean) {
    setMemberForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function updateTitheForm(field: keyof TitheFormState, value: string) {
    setTitheForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSignOut() {
    if (!authService) {
      return;
    }

    await authService.signOut();
    setView('dashboard');
  }

  const pageTitle =
    view === 'dashboard'
      ? 'Dashboard Geral'
      : view === 'members'
        ? 'Membros'
        : view === 'member-form'
          ? editingMemberId
            ? 'Editar Membro'
            : 'Novo Membro'
          : 'Dízimos';
  const searchValue = view === 'members' ? memberSearch : view === 'tithes' ? titheSearch : '';
  const setSearchValue = view === 'members' ? setMemberSearch : setTitheSearch;
  const currentUserName = user?.displayName?.trim() || 'Administrador';

  if (runtimeIsDesktop && !electronBridgeAvailable) {
    return <DesktopBridgeErrorScreen />;
  }

  if (booting) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex items-center gap-3 rounded-full bg-surface-container-low px-6 py-4 text-sm font-semibold text-primary shadow-sm">
          <Building2 size={18} />
          Carregando sistema...
        </div>
      </div>
    );
  }

  if (!activated) {
    return <ActivationScreen onActivate={() => setActivated(true)} />;
  }

  if (!user) {
    if (!authService) {
      return <DesktopBridgeErrorScreen />;
    }

    return <LoginScreen authService={authService} onLogin={(nextUser) => setUser(nextUser)} />;
  }

  return (
    <div className="min-h-screen bg-background text-on-surface xl:grid xl:grid-cols-[18rem_minmax(0,1fr)]">
      <aside className="hidden bg-surface px-5 py-8 xl:flex xl:h-screen xl:flex-col xl:sticky xl:top-0">
        <div className="px-3">
          <p className="font-headline text-3xl font-extrabold text-primary">{PRODUCT_NAME}</p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.28em] text-on-surface-variant">
            Sistema local da igreja
          </p>
        </div>

        <nav className="mt-12 flex-1 space-y-2">
          {sidebarItems.map((item) => (
            <SidebarNavButton
              key={item.id}
              active={view === item.id || (item.id === 'members' && view === 'member-form')}
              icon={item.icon}
              label={item.label}
              onClick={() => setView(item.id)}
            />
          ))}
        </nav>

        <div className="space-y-4 pt-6">
          <button type="button" onClick={startNewMember} className="satin-gradient w-full rounded-xl px-4 py-4 text-sm font-bold text-on-primary shadow-lg">
            Novo Cadastro
          </button>

          <button type="button" onClick={() => setSupportOpen(true)} className="flex w-full items-center gap-3 px-4 py-3 text-sm font-semibold text-on-surface/70 transition-transform hover:translate-x-1">
            <LifeBuoy size={18} />
            Ajuda
          </button>

          <button type="button" onClick={handleSignOut} className="flex w-full items-center gap-3 px-4 py-3 text-sm font-semibold text-error transition-transform hover:translate-x-1">
            <LogOut size={18} />
            Sair
          </button>
        </div>
      </aside>

      <main className="min-w-0">
        <header className="glass-header sticky top-0 z-40 border-b border-outline-variant/20">
          <div className="px-5 py-4 lg:px-8 xl:px-10">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-3 text-primary xl:hidden">
                  <div className="rounded-2xl bg-primary-container p-3 text-on-primary-container">
                    <Building2 size={20} />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-headline text-2xl font-extrabold">{PRODUCT_NAME}</p>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-on-surface-variant">
                      Sistema local da igreja
                    </p>
                  </div>
                </div>
                <p className="mt-3 text-sm font-bold tracking-tight text-primary">{pageTitle}</p>
                <p className="text-xs font-medium text-on-surface-variant">
                  {loadingData ? 'Atualizando registros...' : 'Sistema local pronto para uso.'}
                </p>
              </div>

              <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                {(view === 'members' || view === 'tithes') && (
                  <label className="relative z-10 min-w-0 lg:w-80">
                    <Search
                      size={18}
                      className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-outline"
                    />
                    <input
                      value={searchValue}
                      onChange={(event) => setSearchValue(event.target.value)}
                      type="search"
                      placeholder={view === 'members' ? 'Buscar membros...' : 'Buscar contribuições...'}
                      className="w-full rounded-full bg-surface-container-low px-12 py-3 text-sm outline-none placeholder:text-outline"
                    />
                  </label>
                )}

                <div className="flex items-center gap-3 lg:border-l lg:border-outline-variant/30 lg:pl-6">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-container text-sm font-bold text-on-primary-container">
                    {getInitials(currentUserName)}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-on-surface">{currentUserName}</p>
                    <p className="truncate text-xs text-on-surface-variant">{user.email}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2 xl:hidden">
              {sidebarItems.map((item) => (
                <SidebarNavButton
                  key={item.id}
                  active={view === item.id || (item.id === 'members' && view === 'member-form')}
                  icon={item.icon}
                  label={item.label}
                  onClick={() => setView(item.id)}
                />
              ))}
              <button
                type="button"
                onClick={startNewMember}
                className="satin-gradient rounded-xl px-4 py-3 text-sm font-bold text-on-primary shadow-lg"
              >
                Novo Cadastro
              </button>
              <button
                type="button"
                onClick={() => setSupportOpen(true)}
                className="rounded-xl bg-surface-container-low px-4 py-3 text-sm font-semibold text-on-surface-variant"
              >
                Ajuda
              </button>
              <button
                type="button"
                onClick={handleSignOut}
                className="rounded-xl bg-error-container/20 px-4 py-3 text-sm font-semibold text-error"
              >
                Sair
              </button>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-[1500px] px-5 py-6 lg:px-8 xl:px-10 xl:py-10">
          {view === 'dashboard' ? (
            <DashboardPage
              members={members}
              tithes={tithes}
              userName={currentUserName}
              onCreateMember={startNewMember}
              onOpenTithes={() => setView('tithes')}
              onOpenMembers={() => setView('members')}
            />
          ) : view === 'members' ? (
            <MembersPage
              members={members}
              search={memberSearch}
              onSearchChange={setMemberSearch}
              onCreate={startNewMember}
              onEdit={editMember}
              onDelete={deleteMember}
            />
          ) : view === 'member-form' ? (
            <MemberFormPage
              form={memberForm}
              editing={!!editingMemberId}
              onChange={updateMemberForm}
              onCancel={() => {
                setEditingMemberId(null);
                setMemberForm(emptyMemberForm());
                setView('members');
              }}
              onSubmit={saveMember}
              saving={memberSaving}
            />
          ) : (
            <TithesPage
              members={members}
              tithes={tithes}
              form={titheForm}
              search={titheSearch}
              onSearchChange={setTitheSearch}
              onFormChange={updateTitheForm}
              onSubmit={saveTithe}
              onDelete={deleteTithe}
              onExport={exportTithes}
              saving={titheSaving}
            />
          )}
        </div>
      </main>

      {supportOpen ? <SupportDialog onClose={() => setSupportOpen(false)} /> : null}
      {notice ? <NoticeToast notice={notice} onClose={() => setNotice(null)} /> : null}
    </div>
  );
}

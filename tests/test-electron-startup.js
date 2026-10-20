const { app } = require('electron');
app.whenReady().then(() => {
  console.log("ELECTRON_READY");
  app.quit();
}).catch(err => {
  console.error(err);
  app.exit(1);
});

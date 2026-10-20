"use strict";

// License status only. Authentication, authorization and account data are unchanged.
function registerOpenEditionLicenseHandlers(ipcMain) {
  ipcMain.handle("verify-license", () => true);
  ipcMain.handle("is-activated", () => true);
}

module.exports = { registerOpenEditionLicenseHandlers };

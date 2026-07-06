const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("lw", {
  addProject: (input) => ipcRenderer.invoke("lw:addProject", input),
  generateReport: (identifier) => ipcRenderer.invoke("lw:generateReport", identifier),
  listReports: () => ipcRenderer.invoke("lw:listReports"),
  getSnapshot: () => ipcRenderer.invoke("lw:snapshot"),
  getMarketSnapshot: (options) => ipcRenderer.invoke("lw:marketSnapshot", options),
  readReport: (reportPath) => ipcRenderer.invoke("lw:readReport", reportPath),
  runCommand: (input) => ipcRenderer.invoke("lw:command", input),
  selectProjectFolder: () => ipcRenderer.invoke("lw:selectProjectFolder"),
});

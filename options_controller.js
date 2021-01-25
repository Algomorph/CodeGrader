document.addEventListener('DOMContentLoaded', restoreOptionsLocal);
document.getElementById('save').addEventListener('click', saveOptions);
document.getElementById('restoreDefaults').addEventListener('click', restoreDefaults);
document.getElementById('saveToDisk').addEventListener('click', saveToDisk);
document.getElementById('loadFromDisk').addEventListener("change", handleOptionUpload, false);
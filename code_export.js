let currentLang = 'cpp';

// Change language when user selects from dropdown
document.getElementById('languageSelect').addEventListener('change', function () {
  currentLang = this.value;
});

// Generate code based on selected language
function generateCode() {
  let code = '';

  if (currentLang === 'python') {
    code = Blockly.Python.workspaceToCode(Blockly.getMainWorkspace());
  } else if (currentLang === 'cpp') {
    code = Blockly.Cpp.workspaceToCode(Blockly.getMainWorkspace());
  } else if (currentLang === 'c') {
    code = Blockly.C.workspaceToCode(Blockly.getMainWorkspace());
  }

  document.getElementById('output').value = code;
}

// Copy code to clipboard
function copyCode() {
  const output = document.getElementById('output');
  output.select();
  document.execCommand('copy');
  alert('Code copied to clipboard!');
}

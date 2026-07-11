window.FundezI18n = window.FundezI18n || {
  strings: {},
  t(key, vars) {
    let str = this.strings[key] || key;
    if (vars) {
      str = str.replace(/\{\{(\w+)\}\}/g, (_, k) => (vars[k] != null ? String(vars[k]) : ''));
    }
    return str;
  }
};

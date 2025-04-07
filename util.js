function removeNullKeys(obj) {
  return Object.fromEntries(Object.entries(obj).filter(([k, v]) => v !== null));
}

module.exports = {removeNullKeys}
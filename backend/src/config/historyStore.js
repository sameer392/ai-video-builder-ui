const history = [];

function addHistory(item) {
  history.unshift(item);
  if (history.length > 25) {
    history.pop();
  }
}

function getHistory() {
  return history;
}

module.exports = {
  addHistory,
  getHistory,
};

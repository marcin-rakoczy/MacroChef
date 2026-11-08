window.MacroChefTests = (function () {
  const cases = [];
  const assert = (condition, message) => {
    if (!condition) throw new Error(message);
  };
  const equal = (actual, expected, message) => {
    assert(Object.is(actual, expected), `${message}: expected ${expected}, got ${actual}`);
  };

  function test(name, run) {
    cases.push({ name, run });
  }

  async function run() {
    const result = document.getElementById('result');
    let failures = 0;
    const lines = [];
    for (const item of cases) {
      try {
        await item.run();
        lines.push(`PASS ${item.name}`);
      } catch (error) {
        failures++;
        console.error(item.name, error);
        lines.push(`FAIL ${item.name}: ${error.message}`);
      }
    }
    result.textContent = `${cases.length - failures}/${cases.length} passed\n${lines.join('\n')}`;
    result.dataset.failures = String(failures);
  }

  return { assert, equal, test, run };
})();

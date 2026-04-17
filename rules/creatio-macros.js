'use strict';

module.exports = {
  id: 'creatio-macros',
  category: 'compliance',
  weight: 4,
  detect() {
    // drift is computed in the pipeline by comparing macros.before vs macros.after
    // this rule exists to document the check in the rules catalog; the pipeline enforces
  },
  fix() {}
};

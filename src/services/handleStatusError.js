#!/usr/bin/env node

import Ora from "ora";
/**
 * Handling status errors from API
 *
 * @param {int} status the status code
 */
export const handleStatusError = (status, err) => {
  const spinner = Ora();
  switch (status) {
    case 404:
      spinner.fail("Invalid Organization and/or Project Provided.");
      process.exit();
      break;
    case 401:
      spinner.fail("Invalid token Provided.");
      process.exit();
      break;
    case 500:
      spinner.fail("Server Side Error.", err);
      console.log(err);
      process.exit();
      break;
  }
};

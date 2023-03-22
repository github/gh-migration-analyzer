#!/usr/bin/env node

import { createObjectCsvWriter as createCsvWriter } from "csv-writer";

/**
 * To store metics in a CSV file
 * @param {string} path the name of repository
 * @returns {object} the headers of CVS file
 */
export const csvExporter = (path, header) =>
  createCsvWriter({
    path,
    header,
    headerIdDelimiter: ".",
  });

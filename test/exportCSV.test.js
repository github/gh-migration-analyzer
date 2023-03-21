/* eslint-disable no-undef */
import { csvExporter } from "../src/services/exportCSV";

test("path name is passed to CSV Writer", () => {
  const mockExport = csvExporter("test");
  const mockName = mockExport.fileWriter.path;
  expect(mockName).toEqual("test");
});

test("correct headers are given to the CSV Writer", () => {
  const expectedHeaders = [
    "Project",
    "Repository Name",
    "Number Of Pull Requests",
  ];
  const mockExport = csvExporter("test", expectedHeaders);
  const mockHeaders = mockExport.csvStringifier.header;
  expect(mockHeaders).toEqual(expectedHeaders);
});

test("header id delimiter is a period", () => {
  const mockExport = csvExporter("test");
  const mockDelimiter = mockExport.csvStringifier.headerIdDelimiter;
  expect(mockDelimiter).toEqual(".");
});

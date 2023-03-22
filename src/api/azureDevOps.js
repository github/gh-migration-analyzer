#!/usr/bin/env node

import fetch from "node-fetch";
import * as exportCSV from "../services/exportCSV.js";
import fs from "fs";
import Ora from "ora";
import pLimit from "p-limit";
import { handleStatusError } from "../services/handleStatusError.js";

let credentials = null;
let pullRequests = [];
const spinner = Ora();

/**
 * Get headers for REST API calls
 *
 * @param {String} method the method type
 * @param {String} token the Personal Access Token
 */
export const getHeaders = (method, token) => {
  return {
    method,
    headers: {
      Authorization:
        "Basic " + Buffer.from(`Basic :${token}`).toString("base64"),
    },
  };
};

/**
 * Call store pull Request
 *
 * @param org the organization
 */
export const storeDataController = () => {
  if (pullRequests) {
    const most = pullRequests.reduce((prev, current) =>
      prev.numOfPr > current.numOfPr ? prev : current
    );

    storePullRequest(credentials.organization, pullRequests, most);
  }
};

/**
 * If authorized to organization
 *
 * @param {Object} credentials the credentials
 */
export const authorization = async (credential) => {
  await fetch(
    `https://dev.azure.com/${credential.organization}/_apis/projects?api-version=6.0`,
    getHeaders("GET", credential.token)
  )
    .then((res) => {
      handleStatusError(res.status);
    })
    .catch((_err) => {
      handleStatusError(401);
    });
  credentials = credential;
};

/**
 * Get All projects given the organization
 *
 * @param {Object} credential
 */
export const getAllProjects = async (credential) => {
  let skip = 0;
  let result = {};

  do {
    result = await fetch(
      `https://dev.azure.com/${credential.organization}/_apis/projects` +
        `?$skip=${skip}&$top=100&api-version=6.0`,
      getHeaders("GET", credential.token)
    )
      .then((res) => res.json())
      .catch((err) => console.log("\nError: Server Side Error\n", err));
    skip += 100;

    // For each of the project, fetch all repository
    for (const project of result.value) {
      console.log("");
      spinner.info(
        `Fetching Pull Request Information for Project ${project.name}`
      );
      await getRepositoryInProject(
        { ...credential, project: project.id },
        false
      );
    }
  } while (result.count === 100);
  storeDataController();
};

/**
 * Get All repositories in project
 *
 * @param {Object} credential the credentials
 * @param {Boolean} single the only project specified
 */
export const getRepositoryInProject = async (credential, single) => {
  const result = await fetch(
    `https://dev.azure.com/${credential.organization}/${credential.project}/_apis/git/repositories?api-version=6.0`,
    getHeaders("GET", credential.token)
  )
    .then((res) => {
      handleStatusError(res.status);
      return res.json();
    })
    .catch((_err) => {
      handleStatusError(500);
    });

  if (single) credentials = credential;
  await getRepositoryInformation(result.value);
  if (single) storeDataController();
};

/**
 * get Pull Request Information about Repository
 *
 * @param {[Objects]} repositories the credentials
 */
export const getRepositoryInformation = async (repositories) => {
  const limit = pLimit(5);
  const spinner = Ora();
  const store = [];

  for (const repo of repositories) {
    if (repo.isDisabled) {
      spinner.fail(`Disabled Repository ${repo.name}`);
      continue;
    }

    const authorization = {
      organization: credentials.organization,
      project: repo.project.name,
      repositoryID: repo.id,
      token: credentials.token,
    };
    store.push({ auth: authorization, repoName: repo.name });
  }

  const promises = store.map((item) => {
    return limit(() => storeRepositoryPromise(item.auth, item.repoName));
  });

  // Store fetched PR information into global variable
  pullRequests = pullRequests.concat(await Promise.all(promises));
};

/**
 * Used to store promise used in Promise.all() to speed up fetching
 * PR information
 *
 * @param {Object} Authorization the credentials
 * @param {String} repoName the repository name
 * @return {Object} the PR information
 */
export const storeRepositoryPromise = async (Authorization, repoName) => {
  const spinner = Ora();
  spinner.start(`Fetching  ${repoName}`);
  const fetchedRepo = await fetchAzureDevOpsRepo(Authorization);

  const toReturn = await getAzureDevOpsRepoPR({
    ...fetchedRepo,
    Authorization,
  });
  spinner.succeed(`Fetched PR metrics for Repository ${repoName}`);
  return toReturn;
};

/**
 * Fetch AzureDevOps repository information
 *
 * @param {object} Authorization the credentials for a repository
 * @returns {object} the fetched repository information combined with Authorization object
 */
export const fetchAzureDevOpsRepo = async (Authorization) => {
  return await fetch(
    `https://dev.azure.com/${Authorization.organization}/${Authorization.project}/_apis/git/repositories/${Authorization.repositoryID}?api-version=6.0`,
    getHeaders("GET", Authorization.token)
  )
    .then((res) => res.json())
    .then((data) => (data = { ...data, Authorization }))
    .catch((err) => {
      console.log("\nError: Server Side Error\n", err);
      return false;
    });
};

/**
 * Fetch and store all Pull Request of a specific repository in a CSV
 *
 * @param {object} repo the fetched repository object
 */
export const getAzureDevOpsRepoPR = async (repo) => {
  let pullRequestCount = 0;
  let skip = 0;
  let result = {};

  do {
    result = await fetch(
      repo._links.pullRequests.href +
        `?$skip=${skip}&$top=100&searchCriteria.status=all&api-version=6.0`,
      getHeaders("GET", repo.Authorization.token)
    )
      .then((res) => res.json())
      .catch((err) => console.log(err));
    pullRequestCount += result.count;
    skip += 100;
  } while (result.count === 100);

  // Store comments of PR and nested comments in a CSV
  // result.value is a list of objects of all pull request in a repository
  return {
    numOfPr: pullRequestCount,
    repoName: repo.name,
    project: repo.Authorization.project,
  };
};

/**
 * Call CSV service to export repository pull request information
 *
 * @param {String} organization the organization
 * @param {[Object]} data the fetched repositories pr data
 * @param {{Object}} mostPr the repository with most PR
 */
export const storePullRequest = (organization, data, mostPr) => {
  organization = organization.replace(/\s/g, "");
  const dir = `./${organization}-Pull-Requests`;
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }

  const headers = [
    { id: "project", title: "Project" },
    { id: "repoName", title: "Repository Name" },
    { id: "numOfPr", title: "Number Of Pull Requests" },
  ];

  const path = `./${organization}-Pull-Requests/Pull-Requests.csv`;
  console.log("");
  spinner.start("Exporting...");
  exportCSV.csvExporter(path, headers).writeRecords(data);
  spinner.succeed(`Exporting Completed: ${path}`);

  console.log(
    `${mostPr.project}/${mostPr.repoName}`,
    "[Project/Repository]",
    `contains the most Pull Requests [${mostPr.numOfPr}]`
  );
};

// Copyright 2021 The Province of British Columbia
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//

const adminDB = 'admin';
const rootUser = {
  user: process.env.MONGODB_ADMIN_USERNAME,
  pwd: process.env.MONGODB_ADMIN_PASSWORD,
  roles: [{
    role: 'root',
    db: adminDB
  },
  ]
};

const appUser = {
  user: process.env.MONGODB_USER,
  pwd: process.env.MONGODB_PASSWORD,
  roles: [{ role: 'dbOwner', db: process.env.MONGODB_DATABASE }]
};

const log = (message) => {
  print(`INFO : ${message}`);
}

const main = () => {

  const conn = Mongo();
  let mydb;

  log("Adding initial db users if required.");

  mydb = conn.getDB(adminDB);
  if (!mydb.getUser(process.env.MONGODB_ADMIN_USERNAME)) {
    log("Adding admin user.");
    mydb.createUser(rootUser);
  } else {
    log("Admin user already exists. Skipping.");
  }

  mydb = conn.getDB(process.env.MONGODB_DATABASE);
  if (!mydb.getUser(process.env.MONGODB_USER)) {
    log("Adding application user.");
    mydb.createUser(appUser);
  } else {
    log("Application user already exists. Skipping.");
  }
}

main();

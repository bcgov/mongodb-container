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

const firstMemberPriority = 1.1;
const firstMemberID = 0;
const codeNotYetInitialized = 94;
const fullHostName = process.env.HOST_NAME;
const replicaSetName = process.env.MONGODB_REPLICA_NAME;

if (typeof fullHostName === 'undefined' || fullHostName === "") {
  print("ERROR : You must define the environment variable FQ_HOST_NAME");

  process.exit(1);
}

const log = (message) => {
  print(`INFO : ${message}`);
}

// Initialize the replica set with the first member,
// assign `_id` 0 to match the first `StatefulSet` member
// ID.
const initReplicaSet = (replicaSetName, memberID, memberName) => {

  const rsConfig = {
    _id: replicaSetName,
    members: [{
      _id: memberID,
      host: memberName
    }]
  };

  print('Initalizing replica set.');

  rs.initiate(rsConfig);

  log('Waiting for PRIMARY ...');

  while (!rs.isMaster().ismaster) { 
    log('Waiting ...');

    sleep(100); 
  }

  log('PRIMARY on-line. Moving on.');
}

// When started as a `StatefulSet` on k8s its better to have
// the first stateful set member be the PRIMARY because its
// first to start, and last to shut down.
const bumpFirstMemberZeroPriority = () => {

  log('Checking member priority.');

  let config = rs.config();
  for (const m in config.members) {
    // The first `StatefulSet` member would be `*-0` and
    // we added it with `_id` 0.
    if (config.members[m]._id === firstMemberID) {
      if (config.members[m].priority === firstMemberPriority) {
        log(`First member priority already ${firstMemberPriority}. Skipping.`);
        
        return;
      }

      // Bump the member priority so the PRIMARY role
      // gravitates towards it.
      log('Bumping first member priority.');
      
      config.members[m].priority = firstMemberPriority;
      rs.reconfig(config);
    }
  }
}

const addMemberToReplicaSet = (host) => {

  const [ shortName ] = host.split('.');
  const memberExists = rs.config().members.filter(m => m.host.split(':')[0] === host).length > 0;

  if (memberExists) {
    log(`Member ${shortName} exists. Skipping.`);
    
    return;
  }

  log(`Adding ${shortName} to replica set`);
  rs.add(host);
}

const main = () => {

  log('Running management script.');

  try {
    rs.status(); // TODO:(jl) Probably a better way to do this.
    addMemberToReplicaSet(fullHostName);
  } catch (e) {
    if (e.code === codeNotYetInitialized) {
      initReplicaSet(replicaSetName, firstMemberID, fullHostName);
      bumpFirstMemberZeroPriority(); 
    }
  }

  log('Done.');
}

main();

process.exit(0);

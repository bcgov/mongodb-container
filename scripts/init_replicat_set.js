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
const [ hostName ] = process.env('FQ_HOST_NAME').split('.');
const hostID = hostName.split('-').pop();

const log = (message) => {
  console.log(`INFO : ${message}`);
}
const initReplicaSet = () => {

  log('Initalizing replica set.');

  const rsConfig = {
    _id: hostID,
    members: [{
      _id: hostID,
      host: hostName
    }]
  };

  rs.initiate(rsConfig);

  log('Waiting for PRIMARY ...');

  while (!rs.isMaster().ismaster) { 
    sleep(100); 
  }
}

const bumpMemberZeroPriority = () => {

  log('Bumping first member priority.');

  let config = rs.config();
  config.members[0].priority = firstMemberPriority;
  
  rs.reconfig(config);
}

const rsStatus = rs.status();

if (typeof rsStatus.code != 'undefined' && rsStatus.code === 94) { // NotYetInitialized

  log("Detected uninitialized replica set");

  initReplicaSet();
  bumpMemberZeroPriority();
}





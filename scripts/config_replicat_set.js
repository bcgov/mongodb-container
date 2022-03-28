// Copyright 2022 The Province of British Columbia
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

const fullHostName = process.env.HOST_NAME;
const replicaSetName = process.env.MONGODB_REPLICA_NAME;
const clusterName = process.env.MONGODB_CLUSTER_NAME;
const mongoPrimary = process.env.MONGODB_PRIMARY;
const mongo0Port = process.env.MONGODB_0_PORT;
const mongo1Port = process.env.MONGODB_1_PORT;
const mongo2Port = process.env.MONGODB_2_PORT;
const mongoPrimaryCluster = process.env.MONGODB_PRIMARY_CLUSTER;

const log = (message) => {
  print(`REPLICASET-SETUP: ${message}`);
}

// Check environment variables
if (typeof fullHostName === 'undefined' || fullHostName === "") {
  log("ERROR: Missing required environment variable HOST_NAME");
  process.exit(1);
}
if (typeof replicaSetName === 'undefined' || replicaSetName === "") {
  log("ERROR: Missing required environment variable MONGODB_REPLICA_NAME");
  process.exit(1);
}

// fullHostName may be in the form 'hostname:port'; ':port' is optional
//   hostname is a fully qualified domain name beginning with 'mongodb-*'
// Get the host short name and its number
const [FQDN, portNumber] = fullHostName.split(':');
const [shortName, ...domainParts] = FQDN.split('.');
const [nodeLabel, nodeNumber] = shortName.split('-');
var nodeID = parseInt(nodeNumber);

// For cross-cluster configuration, get our port from the env var
var myPort = "27017"
if (nodeID == '0') { myPort = mongo0Port; }
else if (nodeID == '1') { myPort = mongo1Port; }
else if (nodeID == '2') { myPort = mongo2Port; }

// Set replica member name like: mongors-gold-0:12345
// The hostname used when registering with the replica set must not match the
// actual hostname, otherwise it won't be able to connect on the port used by
// the TransportServerClaim, so we use "mongors-" as the RS member name.
var replicaHostName = "mongors-" + clusterName + "-" + nodeID;
var replicaHostNameAndPort = replicaHostName + ":" + myPort;
var primaryPriority = 3;
var secondaryPriority = 1;
var memberExists = 0;

// See if the replica set is configured and contains this member.  If so, exit.
// ----------------------------------------------------------------------------
log(`replicaHostName: ${replicaHostName}`);
try {
  memberExists = rs.config().members.filter(m => m.host.split(':')[0] === replicaHostName).length;
} catch(e) {
  log('Replica set not configured');
}
if (memberExists > 0) {
  log(`Member ${replicaHostName} already exists in replica set.`);
  process.exit(0);
}

// If this is the first instance (mongodb-0), initiate the replica set and add
//   this node with priority ${primaryPriority} (higher priority)
// If any other node, add it with priority ${secondaryPriority} (lower priority)
// -----------------------------------------------------------------------------
if (replicaHostName === mongoPrimary && clusterName == mongoPrimaryCluster) {
  log("Initializing replica set")
  const rsConfig = { _id: replicaSetName, members: [{ _id: 0, host: replicaHostNameAndPort, priority: primaryPriority }] }
  try {
    rs.initiate(rsConfig);
  } catch (e) {
    log('Failure initializing replica set');
    log(`ERROR errmsg: ${e.errmsg}`);
    log(`ERROR code: ${e.code}`);
  }
}
else {
  log('Adding member to replica set');
  const rsAdd = { _id: nodeID, host: replicaHostNameAndPort, priority: secondaryPriority }
  rs.add(rsAdd);
}

log('Done.');

process.exit(0);

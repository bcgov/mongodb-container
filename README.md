# TL;DR

This repo is all about a MongoDB 3.6 container to replace the recently deprecated image from RedHat. When started it will want to create a replica set (RS) for high availability (HA); if you don't want HA better to use the [official mongoDB image](https://hub.docker.com/_/mongo/)

# Introduction

This image was crafted to be a drop-in replacement for the now deprecated [RedHat mongoDB image](registry.redhat.io/rhscl/mongodb-36-rhel7). Unlike the RH image,
this image will only run in a high availability (HA) configuration. In your dev, test, or stage environment just run with a single member (pod) of the RS. In production, run with a minimum of 3 pods.

This image will run the official mongoDB RPM packages. While they are stable the management scripts for this image (start/stop/management) are fairly new. As such, this image should be considered BETA.

# How To

This section will take you through how to build and run your very own HA mongoDB cluster, and, in the event of an emergency, offer some pro-tips on how to recover. 

Before building your own copy of this image, check the `bcgov` namespace or artifactory to see if it exists in a usable format:

```console
oc get is -n bcgov
```

```console
➜  mongodb-container git:(master) ✗ oc get is -n bcgov
NAME               IMAGE REPOSITORY                                                     TAGS          UPDATED
patroni-postgres   image-registry.apps.silver.devops.gov.bc.ca/bcgov/patroni-postgres   12.4-latest   4 weeks ago
postgres           image-registry.apps.silver.devops.gov.bc.ca/bcgov/postgres           12.4          4 months ago
mongodb-ha   image-registry.apps.silver.devops.gov.bc.ca/bcgov/mongodb-ha    3.6-latest          2 weeks ago
```

In the sample above `mongodb-ha` is the `ImageStream` you want.

## Build

To build your own image, run the templates included with this repository against your **tools** namespace:

```console
oc process -f openshift/templates/build.yaml| \
oc apply -f -
```

After a few minutes you'll have a newly minted image you can deploy in place of the RedHat image, or as a new instance.

**Pro Tip 🤓**

Included in this repo is a `CronJob`. Use it to periodically rebuild the image so that it can automatically pickup any security updates and bug fixes for both the base image (RedHat UBI 8) or mongoDB.

## Run

WIP....


## Get Out of Trouble


This is general wisdom to help you run and mange a MongoDB HA replica set.

1. CLI

The `mongo` CLI is your friend. You can connect to the mongoDB directly with the admin or application account, in general, use the admin account for administration. If you're doing any work with the RS you **must** connect to the PRIMARY.

```console
mongo -u ${MONGODB_ADMIN_USERNAME} -p ${MONGODB_ADMIN_PASSWORD} --host ${MONGODB_SERVICE_NAME}
```

Omit the `--host` parameter if you like, it will connect to the mongoDB instance running in the pod your terminal is open on.

2. Replica Set Management

Learn about and mage the RS with the `rs` command set:

`rs.status()`
Use this command to learn about your RS.

`rs.add()`
Use this command to add a RS member. In general its not required, the container deals with this.

`rs.remove()`
This one you may need from time to time. As you suspect, it will remove a member from the RS.

Review the on-line documentation for more commands as needed.

3. Shutdown

When the container (pod) needs to shutdown it will also turn down the mongoDB instance in a sane way. If you want to do this manually, here are a few points to note:

- Run `db.runCommand({ replSetFreeze: numOfSeconds })` on SECONDARY to prevent it/them fom promoting to primary.
  
- Run `rs.stepDown(seconds)` on the PRIMARY. This will check to make sure at least one of the secondaries is sufficiently caught up to oplog before stepping down. Choose a reasonably long wait time depending on the size of your database and how far behind you think it is.

Also use this command if a secondary becomes a primary and you don't want that.

- Run `db.adminCommand({shutdown: 1,force: false})` on any member to gracefully shutdown mongoDB.

4. Startup

When the container starts it will automatically initialize the RS and add itself as a member. If you want to bring it up manually, you can freeze a SECONDARY to stop it from promoting.

- Run `rs.freeze(seconds)` on all secondaries with a lengthy timeout (say, 1-2 minutes) to prevent them from promoting to PRIMARY.

# TODO

- Look into using `ping` to check for server status rather than `/tmp/initalized`:

```console
mongo --quiet --host 127.0.0.1 --port 27017 -u $MONGO_INITDB_ROOT_USERNAME -p $MONGO_INITDB_ROOT_PASSWORD --eval "db.adminCommand('ping')"
```

- Look into if, as a best practice, nodes are removed from a replica set on shutdown.

- Add mongo-shell to the image and use that to setup and configure the hosts: https://downloads.mongodb.com/compass/mongosh-1.0.0-linux-x64.tgz

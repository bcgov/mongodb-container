FROM registry.access.redhat.com/rhel8/ubi

ENV SUMMARY="MongoDB NoSQL database server" \
    DESCRIPTION="MongoDB (from humongous) is a free and open-source \
cross-platform document-oriented database program. Classified as a NoSQL \
database program, MongoDB uses JSON-like documents with schemas. This \
container image contains programs to run mongod server."

LABEL summary="$SUMMARY" \
      description="$DESCRIPTION" \
      io.k8s.description="$DESCRIPTION" \
      io.k8s.display-name="MongoDB 3.6" \
      io.openshift.expose-services="27017:mongodb" \
      io.openshift.tags="database,mongodb,rh-mongodb36" \
      name="bcgov/mongodb-36-rhel8" \
      usage="docker run -d -e MONGODB_ADMIN_PASSWORD=my_pass rhscl/mongodb-36-rhel7" \
      version="1"

ENV MONGODB_VERSION=3.6 \
    HOME=/var/lib/mongo \
    SCRIPTS_PATH=/opt/bin
ENV PATH=$SCRIPTS_PATH:$PATH

# Copy entitlements
COPY ./etc-pki-entitlement /etc/pki/entitlement

# Copy subscription manager configurations
COPY ./rhsm-conf /etc/rhsm
COPY ./rhsm-ca /etc/rhsm/ca

COPY scripts/add-mongodb-repo /opt/bin/add-mongodb-repo

# mongodb-org package will install:
#   1. mongodb-org-server – MongoDB daemon mongod
#   2. mongodb-org-mongos – MongoDB Shard daemon
#   3. mongodb-org-shell – A shell to MongoDB
#   4. mongodb-org-tools – Tools (dump, restore, etc)

# Package setup
RUN INSTALL_PKGS="numactl rsync jq hostname procps mongodb-org" && \
    rm /etc/rhsm-host && \
    yum repolist --disablerepo=* && \
    add-mongodb-repo && \
    yum update && \
    yum upgrade && \
    subscription-manager repos --enable "rhel-8-for-x86_64-baseos-rpms" && \
    yum install -y --setopt=tsflags=nodocs $INSTALL_PKGS && \
    yum clean all -y && \
    rm -rf /var/cache/yum

# Increment this to trigger a rebuild from this layer onwards.
ENV IMG_BUILD_VERSION=5

COPY scripts/container-entrypoint /usr/bin/container-entrypoint
COPY scripts/fix-perms /usr/bin/fix-perms
COPY scripts/run-mongod /opt/bin/run-mongod
COPY mongod.conf /etc/mongod.conf

# Containter setup
RUN mkdir -p ${HOME}/data \
    /docker-entrypoint-initdb.d && \
    fix-perms /etc/mongod.conf ${HOME} ${SCRIPTS_PATH}

EXPOSE 27017

ENTRYPOINT ["container-entrypoint"]

CMD ["run-mongod"]

VOLUME ["/var/lib/mongodb/data"]

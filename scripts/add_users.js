
const authDB = 'admin';

const rootUser = {
  user: process.env.MONGODB_ADMIN_USERNAME,
  pwd: process.env.MONGODB_ADMIN_PASSWORD,
  roles: [{
    role: 'root',
    db: authDB
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

  if (db.system.users.count({ user: process.env.MONGODB_ADMIN_USERNAME }) > 0) {
    log("Adding admin user exists.");
    db.createUser(rootUser);
  } else {
    log("Admin user already exists. Skipping.");
  }

  if (db.system.users.count({ user: process.env.MONGODB_USER }) > 0) {
    log("Adding application user.");
    db.createUser(appUser);
  } else {
    log("Application user already exists. Skipping.");
  }
}

main();

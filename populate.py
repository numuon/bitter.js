#!python

import os, sys, sqlite3, bcrypt

users_dir = './dataset-medium/users'

conn = sqlite3.connect('bitter.db')
c = conn.cursor()

all_keys = ['username', 'password', 'full_name', 'email', 'home_suburb', 'home_latitude', 'home_longitude', 'pic']

c.execute("CREATE TABLE users (%s);" % ",".join(all_keys))
c.execute("CREATE TABLE listens (username, listen);")

for user in os.listdir(users_dir):
    keys = []
    values = []
    listens = []
    with open(os.path.join(users_dir,user,"details.txt")) as f:
        for line in f:
            field, _, value = line.rstrip().partition(": ")
            if field == 'listens':
                listens = value.split(' ')
                continue
            if field == 'password':
                value = bcrypt.hashpw(value, bcrypt.gensalt())
            keys.append(field)
            values.append(value)
    if os.path.exists(os.path.join(users_dir,user,"profile.jpg")):
        with open(os.path.join(users_dir,user,"profile.jpg")) as f:
            pic = f.read()
            keys.append('pic')
            values.append(buffer(pic))
    insert_str = "INSERT INTO users (%s) values (%s);" % (",".join(keys),",".join(['?']*len(keys)))
    # print insert_str, ','.join(values)
    c.execute(insert_str, values)

    for listen in listens:
        c.execute("INSERT INTO listens (username, listen) values (?,?);", (user, listen))

conn.commit()

# for user in os.listdir(users_dir):
#     details = {}
#     with open(os.path.join(users_dir,user,"details.txt")) as f:
#         for line in f:
#             field, _, value = line.rstrip().partition(": ")
#             details[field] = value
#     values = []
#     for key in keys:
#         if key in details:
#             values.append(details[key])
#         else:
#             values.append(None)
#     insert_str = "INSERT INTO users (%s) values (%s)" % (",".join(keys),",".join(['?']*len(keys)))
#     c.execute(insert_str, values)
# with open(os.path.join(users_dir,user,"bleats.txt")) as f:
#     self.bleats = f.read().split()
#     self.bleats.sort(reverse=True)

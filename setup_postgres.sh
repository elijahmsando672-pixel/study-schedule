#!/usr/bin/expect -f

set timeout 10
set password [lindex $argv 0]

spawn sudo -u postgres psql

expect {
    "Password:" {
        send "$password\r"
    }
    "postgres=#" {
        # Already authenticated
    }
    eof {
        exit 1
    }
}

expect "postgres=#"
send "CREATE USER emoh WITH SUPERUSER PASSWORD 'emoh123';\r"
expect "postgres=#"
send "CREATE DATABASE study_schedule OWNER emoh;\r"
expect "postgres=#"
send "\\q\r"
interact
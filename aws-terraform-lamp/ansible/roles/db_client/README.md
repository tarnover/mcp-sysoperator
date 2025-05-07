# DB Client Role

This Ansible role installs and configures MySQL client and related tools for a LAMP stack on AWS.

## Overview

The DB client role provides the following functionality:

- Installs MySQL client packages and utilities
- Configures MySQL client settings
- Sets up secure database credentials
- Implements database backup and monitoring scripts
- Configures CloudWatch integration for logs and metrics
- Provides PHP database connection libraries
- Sets up database environment variables
- Implements log rotation

## Requirements

- Ansible 2.9 or higher
- AWS CLI installed on the target host (will be installed by the role if not present)
- CloudWatch Agent (will be installed by the role if not present)
- Target host must have access to the RDS instance

## Role Variables

### MySQL Client Configuration

```yaml
mysql_client_packages:
  - mysql-client
  - python3-mysqldb
  - python3-pymysql
  - libmysqlclient-dev
  - mysql-common

mysql_client_utilities:
  - percona-toolkit
  - mytop
  - innotop
  - mysqltuner

mysql_credentials_dir: /etc/mysql/credentials
mysql_credentials_file: "{{ mysql_credentials_dir }}/db-credentials.cnf"
mysql_port: 3306
mysql_charset: utf8mb4
mysql_collation: utf8mb4_unicode_ci
```

### Database Connection Settings

```yaml
db_host: "{{ rds_endpoint | default('localhost') }}"
db_name: "{{ rds_db_name | default('lamp_db') }}"
db_user: "{{ rds_master_username | default('lamp_user') }}"
db_password: "{{ rds_master_password | default('changeme') }}"
db_persistent_connection: false
db_connection_timeout: 10
db_max_connections: 100
db_new_link: false
db_display_errors: false
db_log_errors: true
db_error_log_file: /var/log/php/db-errors.log
```

### SSL Configuration

```yaml
db_ssl_enabled: true
db_ssl_verify: true
mysql_ssl_ca_path: /etc/mysql/ssl/rds-ca-2019-root.pem
```

### Backup Settings

```yaml
db_backup_enabled: true
db_backup_dir: /var/backups/mysql
db_backup_user: root
db_backup_group: root
db_backup_retention: 30
db_backup_bucket: ""
db_backup_prefix: db-backups
db_backup_hour: 3
db_backup_minute: 0
db_backup_sns_topic: ""
```

### Monitoring Settings

```yaml
db_monitoring_enabled: true
db_alert_threshold_connections: 100
db_alert_threshold_slow_queries: 10
db_alert_threshold_replication_lag: 300
db_monitor_sns_topic: ""
db_alarm_sns_topic: ""
```

### Performance Settings

```yaml
db_query_cache_size: 20M
db_query_cache_limit: 1M
db_query_cache_type: 1
db_query_cache_min_res_unit: 4K
db_slow_query_log: true
db_slow_query_log_file: /var/log/mysql/mysql-slow.log
db_long_query_time: 2
```

### CloudWatch Settings

```yaml
cloudwatch_log_group: "{{ aws_resource_prefix | default('lamp') }}-logs"
cloudwatch_log_retention_days: 30
instance_id: "{{ ansible_ec2_instance_id | default(inventory_hostname) }}"
```

### Web Server Settings

```yaml
web_user: www-data
web_group: www-data
web_root: /var/www/html
app_include_path: /var/www/includes
app_db_prefix: ""
app_db_debug: false
```

### Environment Settings

```yaml
db_env_file: /etc/db-env
environment: "{{ env | default('production') }}"
aws_region: "{{ aws_region | default('us-east-1') }}"
```

### Log Settings

```yaml
log_user: root
log_group: root
logrotate_db_template: logrotate-db.j2
```

## Dependencies

- `common` role

## Example Playbook

```yaml
- hosts: web_servers
  become: true
  roles:
    - role: db_client
      vars:
        db_host: "my-rds-instance.amazonaws.com"
        db_name: "my_database"
        db_user: "admin"
        db_password: "secure_password"
        db_backup_bucket: "my-backup-bucket"
        db_backup_sns_topic: "arn:aws:sns:us-east-1:123456789012:db-backup-notifications"
        db_monitor_sns_topic: "arn:aws:sns:us-east-1:123456789012:db-monitoring-notifications"
        db_alarm_sns_topic: "arn:aws:sns:us-east-1:123456789012:db-alarm-notifications"
```

## Templates

The role includes the following templates:

- `my.cnf.j2`: MySQL client configuration
- `db-credentials.cnf.j2`: MySQL credentials file
- `db-backup.sh.j2`: Database backup script
- `db-monitor.sh.j2`: Database monitoring script
- `cloudwatch-db.json.j2`: CloudWatch Agent configuration
- `db-connect.php.j2`: PHP database connection library
- `db-test.php.j2`: PHP database connection test script
- `db-env.j2`: Database environment variables
- `logrotate-db.j2`: Log rotation configuration

## Tasks

The role performs the following tasks:

1. Installs MySQL client packages and utilities
2. Creates MySQL configuration directory and files
3. Sets up database credentials
4. Creates backup and monitoring scripts
5. Configures log directories and rotation
6. Installs and configures AWS CLI and CloudWatch Agent
7. Sets up cron jobs for backup and monitoring
8. Creates PHP database connection libraries
9. Sets up environment variables
10. Tests database connection

## Handlers

The role includes the following handlers:

- `restart cloudwatch agent`: Restarts the CloudWatch Agent
- `reload systemd`: Reloads systemd
- `reload profile`: Reloads the system profile
- `reload cron`: Reloads the cron service

## License

MIT

## Author Information

DevOps Team - LAMP Stack AWS

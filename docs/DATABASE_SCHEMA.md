# Database schema

`users` stores authenticated administrators. `business_settings` is a singleton profile. `parties` stores both customers and vendors with `party_type` separating their workflows. `attendance` records the daily delivery/collection and snapshots the applicable rates. `bills` and `bill_lines` capture monthly financial records; `payments` reconcile bill balances. All tables use InnoDB foreign keys and listed business uniqueness constraints.

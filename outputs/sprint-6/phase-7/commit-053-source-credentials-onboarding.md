# Commit 053 - Source Credentials Onboarding

Dashboard Source onboarding accepts WordPress username/Application Password and
WooCommerce key/secret as masked fields. Runtime validates before persisting the
credentials only in `sites/<site>/config/source-credentials.json` with mode
`0600`; `source.json` remains secret-free.

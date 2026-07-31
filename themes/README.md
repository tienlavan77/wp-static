# Shared Themes

`themes/` contains executable shared presentation assets. Themes receive the
normalized Content Model through the Builder renderer contract and do not read
Source credentials, Setup state, Scheduler jobs or Runtime secrets.

`themes/storefront/` is the shared Runtime storefront theme. Its layouts,
components, CSS and declared assets are Builder inputs; Output Pipeline remains
the only writer of generated Site files.

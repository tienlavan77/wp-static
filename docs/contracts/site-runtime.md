# Site Runtime Contract

Each Site Skeleton has `public/index.php`, `config/site.json`, and private
storage. Browser requests resolve a Site by domain, run Installation Check, and
route to Installer when the Site is not installed or Dashboard when it is.

Bootstrap/Runtime owns this boundary; it does not perform Setup, Source
registration, Scheduling, Build, rendering, or output writes.

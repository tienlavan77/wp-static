# First Build Runtime Contract

Dashboard First Build Controller transitions a ready Site to `BUILDING`, submits
one browser-triggered Job to Scheduler, and waits for Scheduler dispatch result.
It never calls Build Engine directly. A successful Build persists Build metadata
and moves the Site to `RUNNING`; failure moves it to `ERROR`.

Build output is owned by Output Pipeline at `sites/<site>/public/dist/`.

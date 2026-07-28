# Scheduler Trigger Gateways

Browser Build API, CLI build command, and Scheduler webhook receiver are thin
gateways. Each submits only `siteId` and its fixed trigger type to Scheduler.
They never access Queue, Dispatcher, or Build Engine directly.

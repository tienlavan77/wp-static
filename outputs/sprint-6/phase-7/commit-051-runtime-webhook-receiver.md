# Commit 051 - Runtime Webhook Receiver

WordPress bridge requests `POST /webhook/<site-uuid>`. Runtime verifies the
persisted UUID and secret, then submits the fixed `webhook` trigger to Scheduler.
The receiver never accesses Queue, Dispatcher, or Build Engine directly.

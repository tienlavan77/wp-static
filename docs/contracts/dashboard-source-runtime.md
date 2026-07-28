# Dashboard Source Runtime Contract

Dashboard Source Controller is a thin Runtime gateway to Source Registration
Service. Test Connection invokes only adapter initialize/validate/health checks
and does not persist metadata. Register Source invokes the shared registration
workflow and persists through Setup-owned services.

Dashboard supplies the route-owned Site id; it does not accept a client-selected
Site id, perform source logic, register webhooks, or trigger builds.

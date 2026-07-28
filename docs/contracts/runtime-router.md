# Runtime Router Contract

Runtime Router converts Node Runtime HTTP requests into controller calls after
Site Runtime resolves the Domain. It exposes Installer, Dashboard, Source,
Webhook Registration, and First Build endpoints. The Router dispatches only;
all business logic remains in the injected Runtime controllers and services.

# Build Integration Contract

Build Integration composes the existing components in one order: injected
Content Reader -> Content Pipeline -> Theme Renderer -> Output Pipeline. Build
Engine starts, finishes, or fails the lifecycle around that work.

Content Reader returns declared `items` and optional declared `assets`. It is
the source boundary; Theme Renderer never receives it. Output Pipeline is the
only component that receives pages and writes filesystem output.

# Modelo de datos

`Channel` contiene la identidad de YouTube y tiene muchos `Video`, `KnowledgeFact` y `ChangeEvent`. `Video` pertenece a un canal y puede tener un `Transcript`, un `VideoAnalysis`, hechos y cambios. Transcript y analysis son uno-a-uno para evitar versiones implícitas; las nuevas ejecuciones pueden versionarse luego con tablas de ejecución si el producto lo necesita.

`KnowledgeFact.value` y los snapshots de `ChangeEvent` son JSON porque el valor puede ser texto, número, lista o estructura. Los enums limitan estados y categorías en la base; Zod limita inputs antes de persistir.
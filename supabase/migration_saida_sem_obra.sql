-- ObraStock — permitir saída sem vínculo com obra
-- Use este arquivo somente se o schema.sql anterior já tiver sido executado.

alter table public.movements
  drop constraint if exists movement_destination_check;

-- Após a execução, work_id continua aceitando uma obra, mas também permite NULL.

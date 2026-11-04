-- Commerce foreign-key index coverage.
-- Build covering B-tree indexes for public foreign keys that lack a matching
-- valid leading-column index. This includes any tenant-scoped FK added later.
begin;

do $$
declare
  r record;
  v_index_name text;
begin
  for r in
    select c.conrelid, c.conname,
      string_agg(quote_ident(a.attname), ', ' order by u.ord) as columns_sql,
      c.conrelid::regclass as table_ref
    from pg_constraint c
    cross join lateral unnest(c.conkey) with ordinality u(attnum,ord)
    join pg_attribute a on a.attrelid=c.conrelid and a.attnum=u.attnum
    where c.contype='f' and c.connamespace='public'::regnamespace
      and not exists (
        select 1 from pg_index i
        where i.indrelid=c.conrelid and i.indisvalid and i.indisready and i.indpred is null
          and i.indnkeyatts >= cardinality(c.conkey)
          and (
            select array_agg(k.attnum::smallint order by k.ord)
            from unnest(i.indkey::smallint[]) with ordinality k(attnum,ord)
            where k.ord <= cardinality(c.conkey)
          ) = c.conkey
      )
    group by c.conrelid,c.conname
  loop
    v_index_name := left('ix_' || r.conrelid::regclass::text || '_' || r.conname, 63);
    v_index_name := replace(replace(v_index_name, '.', '_'), '"', '');
    execute format('create index if not exists %I on %s (%s)', v_index_name, r.table_ref, r.columns_sql);
  end loop;
end $$;

commit;

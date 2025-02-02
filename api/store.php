<?php

declare( strict_types = 1 );

namespace MDAWaffe\Swarm\API;

abstract class Store {
	abstract public function load( string $table, string $id ): ?array;

	abstract public function store( string $table, string $id, array $item ): bool;

	abstract public function load_long( string $table, string $id );

	abstract public function store_long( string $table, string $id, array $short_item, $long_item ): bool;

	abstract public function last_from( string $table ): ?int;

	abstract public function get_all_ids( string $table ): array;

	abstract public function get_all_long_ids( string $table ): array;
}

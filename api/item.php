<?php

declare( strict_types = 1 );

namespace MDAWaffe\Swarm\API;

abstract class Item {
	public const TABLE = '';
	public const HAS_LONG_FORM = false;

	public const LIMIT = 250;
	public const QUERY_PARAMS = [];

	public function __construct(
		protected \MDAWaffe\Swarm\API $api,
		protected \MDAWaffe\Swarm\API\Store $store,
	) {
	}

	abstract function get( string $id );

	function load( string $id ): ?array {
		return $this->store->load( static::TABLE, $id );
	}

	function store( string $id, array $item ): ?bool {
		return $this->store->store( static::TABLE, $id, $item );
	}

	function load_long( string $id ) {
		if ( ! static::HAS_LONG_FORM ) {
			throw new \LogicException( static::TABLE . ' has no long form.' );
		}

		return $this->store->load_long( static::TABLE, $id );
	}

	function store_long( string $id, array $short_item, $long_item ): bool {
		if ( ! static::HAS_LONG_FORM ) {
			throw new \LogicException( static::TABLE . ' has no long form.' );
		}

		return $this->store->store_long( static::TABLE, $id, $short_item, $long_item );
	}

	function last_from_store(): ?int {
		return $this->store->last_from( static::TABLE );
	}

	function get_all_ids(): array {
		return $this->store->get_all_ids( static::TABLE );
	}

	function get_all_long_ids(): array {
		if ( ! static::HAS_LONG_FORM ) {
			throw new \LogicException( static::TABLE . ' has no long form.' );
		}

		return $this->store->get_all_long_ids( static::TABLE );
	}
}

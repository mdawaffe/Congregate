<?php

declare( strict_types = 1 );

namespace MDAWaffe\Swarm\API;

abstract class Item_List extends Item {
	const TRUNCATE_BY_TIME_KEY = '';

	abstract function list_short();

	abstract function normalize_params();

	abstract function increment();

	public function list( ...$params ) {
		$short_items = $this->list_short( ...$params );

		return $this->lengthen( $short_items );
	}

	public function lengthen( array $items ): iterable {
		return $items;
	}

	public function truncate( $items, $params ) {
		if (
			! static::TRUNCATE_BY_TIME_KEY
		||
			'newestfirst' !== ( $params['sort'] ?? '' )
		||
			null === ( $params['after'] ?? null )
		) {
			return [ $items, false ];
		}

		$truncate_response = false;
		$count_all = count( $items );
		$items = array_filter( $items, fn( $item ) => $item[ static::TRUNCATE_BY_TIME_KEY ] > $params['after'] );
		if ( count( $items ) < $count_all ) {
			$truncate_response = true;
		}

		return [ $items, $truncate_response ];
	}

	public function iterate_short( ...$params ) {
		do {
			$params = $this->normalize_params( ...$params );

			$short_items = $this->list_short( ...$params );

			[ $short_items, $truncate_response ] = $this->truncate( $short_items, $params );

			yield from $short_items;

			if ( $truncate_response ) {
				break;
			}

			$params = $this->increment( ...$params );
			if ( null === $params ) {
				break;
			}
		} while ( count( $short_items ) );
	}

	public function iterate( ...$params ) {
		do {
			$params = $this->normalize_params( ...$params );

			$items = $this->list( ...$params );

			[ $items, $truncate_response ] = $this->truncate( $items, $params );

			yield from $items;

			if ( $truncate_response ) {
				break;
			}

			$params = $this->increment( ...$params );
			if ( null === $params ) {
				break;
			}
		} while ( count( $items ) );
	}
}

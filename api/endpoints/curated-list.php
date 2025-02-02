<?php

declare( strict_types = 1 );

namespace MDAWaffe\Swarm\Endpoint;

use MDAWaffe\Swarm\API\Item_List;

class Curated_List extends Item_List {
	public const TABLE = 'curated-lists';
	public const HAS_LONG_FORM = true;

	public const LIMIT = 200;

	public function get( string $id ) {
		$path = sprintf( 'lists/%s', rawurlencode( $id ) );

		[ $response, $status, $headers ] = $this->api->get( $path, static::QUERY_PARAMS );

		return $response['response']['list'];
	}

	public function list_short(
		?string $group = null,
		?float $latitude = null,
		?float $longitude = null,
		?int $limit = null,
		?int $offset = null,
	) {
		$path = 'users/self/lists';

		if ( null !== $latitude && null !== $longitude ) {
			$ll = sprintf( '%f,%f', $latitude, $longitude );
		} else {
			$ll = null;
		}

		$query_params = [
			...static::QUERY_PARAMS,
			'group' => $group,
			'll' => $ll,
			'limit' => $limit,
			'offset' => $offset,
		];

		$query_params = array_filter( $query_params, fn( $value ) => null !== $value );

		[ $response, $status, $headers ] = $this->api->get( $path, $query_params );

		$lists = [];
		if ( null === $group ) {
			foreach ( $response['response']['lists']['groups'] ?? [] as $group ) {
				foreach ( $group['items'] as $item ) {
					$item['group'] = [
						'type' => $group['type'],
						'name' => $group['name'],
					];
					$lists[] = $item;
				}
			}
		} else {
			$group_name = '';
			switch ( $group ) {
				case 'yours':
					$group_name = 'Your Places';
					break;
				case 'created' :
					$group_name = 'Lists You Created';
					break;
				case 'followed' :
					$group_name = 'Lists You Follow';
					break;
			}
			foreach ( $response['response']['lists']['items'] ?? [] as $item ) {
				$item['group'] = [
					'type' => $group,
					'name' => $group_name,
				];
				$lists[] = $item;
			}
		}

		return $lists;
	}

	public function lengthen( array $items ): iterable {
		foreach ( array_chunk( $items, 5, true ) as $chunk ) {
			$list_ids = array_combine( array_keys( $chunk ), array_column( $chunk, 'id' ) );
			$path = 'multi';
			$requests = array_map(
				fn( $list_id ) => [ 'path' => sprintf( 'lists/%s', $list_id ), 'query_string' => [] ],
				$list_ids,
			);

			[ $responses, $status, $headers ] = $this->api->batch_get( $requests );

			// /v2/lists/:id is not a superset of /v2/users/self/lists[i] :(
			// We need to merge them to get everything.
			$long_lists = array_combine( array_keys( $responses ), array_column( $responses, 'list' ) );
			foreach ( $long_lists as $i => $long_list ) {
				if ( ! isset( $long_list['id'] ) ) {
					continue;
				}

				$long_list = array_merge( $chunk[ $i ], $long_list );
				$long_list['following'] = $chunk[ $i ]['following'] ?? $long_list['following'] ?? false;
				yield $i => $long_list;
			}
		}
	}

	public function normalize_params(
		?string $group = null,
		?float $latitude = null,
		?float $longitude = null,
		?int $limit = null,
		?int $offset = null,
	): array {
		if ( null === $limit || static::LIMIT < $limit ) {
			$limit = static::LIMIT;
		}

		if ( null === $latitude || null === $longitude ) {
			$latitude = null;
			$longitude = null;
		}

		return compact(
			'group',
			'latitude',
			'longitude',
			'limit',
			'offset',
		);
	}

	public function increment(
		?string $group = null,
		?float $latitude = null,
		?float $longitude = null,
		?int $limit = null,
		?int $offset = null,
	): ?array {
		// Pagination doesn't work without group param.
		if ( null === $group ) {
			return null;
		}

		// Pagination doesn't work for the `yours` group.
		if ( 'yours' === $group ) {
			return null;
		}

		return [
			$group,
			$latitude,
			$longitude,
			$limit,
			( $offset ?? 0 ) + $limit
		];
	}
}

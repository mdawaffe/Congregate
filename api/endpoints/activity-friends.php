<?php

declare( strict_types = 1 );

namespace MDAWaffe\Swarm\Endpoint;

use MDAWaffe\Swarm\API\Item_List;

class Activity_Friends extends Item_List {
	public const TABLE = 'activities-friends';
	public const LIMIT = 200;

	protected $leading_marker;
	protected $trailing_marker;
	protected $more_data;

	public function get( string $id ) {
		throw new \Exception( 'Not Implemented' );
	}

	public function list_short(
		?int $limit = null,
		?string $after_marker = null,
		?string $before_marker = null,
		?string $updates_after_marker = null, // Not sure what this does. Edits to checkins? Comments?
		?int $after_timestamp = null,
		?int $before_timestamp = null,
		?int $leaderboard = null, // Whether to include leaderboard data (should be boolean: 0 vs. 1).
	) {
		$path = 'activity/recent';

		// Only works for blessed/official tokens. Short-circuiting for now.
		return [];

		$query_params = [
			...static::QUERY_PARAMS,
			'limit' => $limit,
			'afterMarker' => $after_marker,
			'beforeMarker' => $before_marker,
			'updatesAfterMarker' => $updates_after_marker,
			'afterTimestamp' => $after_timestamp,
			'beforeTimestamp' => $before_timestamp,
			'leaderboard' => $leaderboard,
		];

		$query_params = array_filter( $query_params, fn( $value ) => null !== $value );

		[ $response, $status, $headers ] = $this->api->get( $path, $query_params );
		$this->leading_marker = $response['response']['activities']['leadingMarker'];
		$this->trailing_marker = $response['response']['activities']['trailingMarker'];
		$this->more_data = $response['response']['activities']['moreData'];

		return $response['response']['activities']['items'];
	}

	public function normalize_params(
		?int $limit = null,
		?string $after_marker = null,
		?string $before_marker = null,
		?string $updates_after_marker = null,
		?int $after_timestamp = null,
		?int $before_timestamp = null,
		?int $leaderboard = null,
	): array {
		if ( null === $limit || static::LIMIT < $limit ) {
			$limit = static::LIMIT;
		}

		return compact(
			'limit',
			'after_marker',
			'before_marker',
			'updates_after_marker',
			'after_timestamp',
			'before_timestamp',
			'leaderboard',
		);
	}

	public function increment(
		?int $limit = null,
		?string $after_marker = null,
		?string $before_marker = null,
		?string $updates_after_marker = null,
		?int $after_timestamp = null,
		?int $before_timestamp = null,
		?int $leaderboard = null,
	): ?array {
		if ( ! $this->more_data ) {
			return null;
		}
		
		return [
			$limit,
			$afterMarker,
			$this->trailing_marker, // Set before_marker to previous request's trailing_marker.
			$updates_after_marker,
			$after_timestamp,
			$before_timestamp,
			$leaderboard,
		];
	}
}

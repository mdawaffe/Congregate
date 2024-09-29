<?php

declare( strict_types = 1 );

namespace MDAWaffe\Swarm;

require 'index.php';

$api = new API( '4CGVPVZRKRFIGL2RLMFBL3P3MA51YVGI3EDFKL3HBQ2YGYPZ' );
//$api = new API( 'NT4JQZ4ZV1Y00WPSEFXSBHTM4D43TNUDS03ZGU1PEQRZDL3S' );

$checkin = new Endpoint\Checkin( $api );
$user = new Endpoint\User( $api );
$venue_visited = new Endpoint\Venue_Visited( $api );
$venue_liked = new Endpoint\Venue_Liked( $api );
$curated_list = new Endpoint\Curated_List( $api );
$photo = new Endpoint\Photo( $api );
$tip = new Endpoint\Tip( $api );
$taste = new Endpoint\Taste( $api );
$activity = new Endpoint\Activity( $api );

/*
foreach ( [ 'checkin', 'venue_visited', 'venue_liked', 'curated_list', 'photo', 'tip', 'activity' ] as $list ) {
	$shorts = ${$list}->list_short( limit: 2 );
	foreach ( $shorts as $item ) {
		$id = preg_replace( '/[^a-zA-Z0-9]/', '-', $item['id'] ?? (string) $item['createdAt'] );
		file_put_contents( "$list.$id.short", json_encode( $item, JSON_PRETTY_PRINT ) );
	}

	$longs = ${$list}->list( limit: 2 );
	foreach ( $longs as $item ) {
		$id = preg_replace( '/[^a-zA-Z0-9]/', '-', $item['id'] ?? (string) $item['createdAt'] );
		file_put_contents( "$list.$id.long", json_encode( $item, JSON_PRETTY_PRINT ) );
	}
}
*/

/*
$added = $checkin->add(
	venue_id: '66d25c7d98920629fc3b4ad7',
	datetime: 1724773442,
	latitude: 34.14607887031627,
	longitude: -118.13801253346125,
);

var_dump( $added );
*/

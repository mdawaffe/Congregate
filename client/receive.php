<?php

namespace MDAWaffe\Swarm;

use MDAWaffe\Swarm\API\Store_FS;

if ( 'POST' !== $_SERVER['REQUEST_METHOD'] ) {
	http_response_code( 405 );
	exit;
}

if ( ! isset( $_POST['secret'] ) ) {
	http_response_code( 403 );
	exit;
}

$oauth = file( dirname( __DIR__ ) . '/.oauth' );
$push_secret = trim( $oauth[2] );

if ( ! hash_equals( $_POST['secret'], $push_secret ) ) {
	http_response_code( 403 );
	exit;
}

if ( ! isset( $_POST['user'] ) ) {
	http_response_code( 400 );
	exit;
}

if ( ! isset( $_POST['checkin'] ) ) {
	http_response_code( 400 );
	exit;
}

try {
	$user = json_decode( $_POST['user'], flags: \JSON_THROW_ON_ERROR | \JSON_OBJECT_AS_ARRAY );
} catch ( \JsonException $e ) {
	http_response_code( 400 );
	exit;
}

try {
	$checkin = json_decode( $_POST['checkin'], flags: \JSON_THROW_ON_ERROR | \JSON_OBJECT_AS_ARRAY );
} catch ( \JsonException $e ) {
	http_response_code( 400 );
	exit;
}

require dirname( __DIR__ ) . '/api/index.php';

$store_dir = dirname( __DIR__ ) . '/store';

$access_token = trim( file( dirname( __DIR__ ) . '/.access-token' )[0] );
$api = new API( $access_token );
$store = new Store_FS( $store_dir );

$user_endpoint = new Endpoint\User( $api, $store );

if ( ! $user_endpoint->load( (string) $user['id'] ) ) {
	http_response_code( 401 );
	exit;
}

$checkin_id = sprintf( '%s-%s', $checkin['createdAt'], $checkin['id'] );

try {
	$json = json_encode( $checkin, flags: \JSON_THROW_ON_ERROR );
	$push_file = sprintf( '%s/checkins/pushed/%s.json', __DIR__, $checkin_id );
	file_put_contents( $push_file, $json );

	if ( function_exists( '\\fastcgi_finish_request' ) ) {
		fastcgi_finish_request();
	}

	require dirname( __DIR__ ) . '/build.php';

	build( [ $push_file ] );
} catch( \JsonException $e ) {
	http_response_code( 500 );
	exit;
}


<?php
/**
 * Plugin Name:       Woocommerce Appointments Alternative Event Picker
 * Description:       The normal Appointments calendar view will be replaced by a list of available appointment times.
 * Version:           1.0.0
 * Author:            Invite Services
 * Author URI:        https://invite.hk
 * Text Domain:       invite
 * License:           MIT
 */

// Exit if accessed directly.
defined( 'ABSPATH' ) || exit;

global $wc_appointments;

/*
 * Plugin constants
 */

if(!defined('WOOCOMMERCE_APPOINTMENTS_EVENT_PICKER_URL'))
	define('WOOCOMMERCE_APPOINTMENTS_EVENT_PICKER_URL', plugin_dir_url( __FILE__ ));
if(!defined('WOOCOMMERCE_APPOINTMENTS_EVENT_PICKER_PATH'))
	define('WOOCOMMERCE_APPOINTMENTS_EVENT_PICKER_PATH', plugin_dir_path( __FILE__ ));

include_once( ABSPATH . 'wp-admin/includes/plugin.php' );
include_once( plugin_dir_path( __DIR__ ) . 'woocommerce-appointments/woocommerce-appointments.php');

/*
 * Install the alternative datepicker js code
 */

add_action( 'wp_enqueue_scripts', 'my_plugin_override' );

function my_plugin_override() {
    //This plugin does nothing if woocommerce appointments is not active
    if(is_plugin_active('woocommerce-appointments/woocommerce-appointments.php')){
        wp_enqueue_style('waep-styles', WOOCOMMERCE_APPOINTMENTS_EVENT_PICKER_URL . '/assets/css/styles.css');
        wp_register_script('waep-alternative-datepicker', WOOCOMMERCE_APPOINTMENTS_EVENT_PICKER_URL . '/assets/js/alternative-date-picker.js', array('jquery'),'1.1', true);
        wp_enqueue_script('waep-alternative-datepicker');
    }
    
}

/*
 * Add shortcode to display only appointable products, ie events.
 * 
 * Adds an additional attribute to the standars Woocommerce products shortcode: 
 * 
 * show_historical_appointments
 * 
 * When set to a value of "false" events in the past will be filtered out. 
 */

function appointment_products($atts) {
    $atts = shortcode_atts( array(
        'columns' => '4',
        'orderby' => 'title',
        'order'   => 'asc',
        'template'=> 'product',
        'ids'     => '',
        'skus'    => '',
        'product_type'    => 'appointment',
        'category' => '',
        'show_historical_appointments' => 'false'

    ), $atts );

    
    $query_args = array(
        'post_type'           => 'product',
        'post_status'         => 'publish',
        'ignore_sticky_posts' => 1,
        'orderby'             => $atts['orderby'],
        'order'               => $atts['order'],
        'posts_per_page'      => -1,
        'meta_query'          => WC()->query->get_meta_query(),
        'tax_query'           => array(
                                    array(
                                            'taxonomy' => 'product_type',
                                            'field'    => 'slug',
                                            'terms'    => $atts['product_type'],
                                        ),
                                    ),
    );

    if( ! empty( $atts['category'] ) && strlen( $atts['category'] ) > 0 ){
        array_push($query_args['tax_query'],array(
            'taxonomy' => 'product_cat',
            'field'    => 'slug',
            'terms'    => $atts['category'],
        ));

    }

    if ( ! empty( $atts['skus'] ) ) {
        $query_args['meta_query'][] = array(
            'key'     => '_sku',
            'value'   => array_map( 'trim', explode( ',', $atts['skus'] ) ),
            'compare' => 'IN'
        );
    }

    if ( ! empty( $atts['ids'] ) ) {
        $query_args['post__in'] = array_map( 'trim', explode( ',', $atts['ids'] ) );
    }
    return product_loop( $query_args, $atts, 'products' );
}

function product_loop( $query_args, $atts, $loop_name ) {
    global $woocommerce_loop;

    $products                    = new WP_Query( apply_filters( 'woocommerce_shortcode_products_query', $query_args, $atts, $loop_name ) );
    $columns                     = absint( $atts['columns'] );
    $woocommerce_loop['columns'] = $columns;

    ob_start();

    if ( $products->have_posts() ) {
        do_action( "woocommerce_shortcode_before_{$loop_name}_loop" );
        do_action( 'woocommerce_before_single_product' );
        woocommerce_product_loop_start();
        while ( $products->have_posts() ) {
            $products->the_post();
            global $product;
            //Only show events that are not in the past and are not too far off in the future to be bookable.
            if( is_wc_appointment_product($product) ){
                $slots_in_range = product_slots($product);
                if( (!is_wp_error( $slots_in_range ) && is_array($slots_in_range) && count($slots_in_range)>0) || $atts['show_historical_appointments']=='true' ) {
                    wc_get_template_part( 'content', $atts['template'] );
                }
            }
        }

        woocommerce_product_loop_end();
        do_action( "woocommerce_shortcode_after_{$loop_name}_loop" );

    }

    woocommerce_reset_loop();
    wp_reset_postdata();

    return '<div class="woocommerce columns-' . $columns . '">' . ob_get_clean() . '</div>';
}

add_shortcode( apply_filters( "appointment_products_shortcode_tag", "appointment_products" ), "appointment_products" );

/*
 * Insert dates on the product listing for appointable product with duration unit of "day"
 */

add_filter("woocommerce_before_shop_loop_item_title","add_appointment_dates",13);
add_filter('woocommerce_before_single_product_summary',"add_appointment_dates",13);

function add_appointment_dates(){
    global $product;
    if( is_wc_appointment_product($product) ){
        $slots_in_range = product_slots_bookable($product);
        $appointments = wc_appointments_get_time_slots($product,$slots_in_range);
        $duration_period = $product->duration > 1 ? $product->duration_unit . "s" : $product->duration_unit;
        if( !is_wp_error( $appointments ) && $product->duration_unit=="day") {
            $slots_count = count($slots_in_range);
            $n = 1;
            $conjunction = "";
            ?><div class="appointment-slot-dates"><?php
            foreach($slots_in_range as $slot){
                if( $n == $slots_count && $slots_count>1 ){
                    $conjunction = "and<br>";
                }
                $day_num = date("j",$slot);
                $day_with_suffix = ordinal($day_num);
                $month = date("F", $slot);
                $year = date("Y", $slot);
                echo  $conjunction . "<span class='event-day'>" . $day_with_suffix . " "  . $month . " </span><span class='event-year'>" . $year . "</span><br>";
                $n += 1;
            }
            ?>
            <div class="appointment-slot-duration"><?php echo $product->duration . " " . $duration_period; ?></div>
            </div><?php
        }
    }
}

function ordinal($number) {
    $ends = array('th','st','nd','rd','th','th','th','th','th','th');
    if ((($number % 100) >= 11) && (($number%100) <= 13))
        return $number. 'th';
    else
        return $number. $ends[$number % 10];
}

/*
 * Insert number of slots available 
 */
add_filter("woocommerce_before_single_product_summary","add_slots_left",11);
function add_slots_left(){
    global $product;

    if( is_wc_appointment_product($product) ){
        
        $slots_in_range = product_slots_bookable($product);
        $appointments = wc_appointments_get_time_slots($product,$slots_in_range);
 
        if( !is_wp_error( $appointments ) ) {
            $available_count = 0;

            foreach($appointments as $a){
                $available_count += $a["available"];
            }

            $slots_message = $available_count < 5 && $available_count > 0 ? "Only " . $available_count . " places left!" : "";
            $slots_message = $available_count == 0 ? "SOLD OUT" : $slots_message;
            ?><div class="slots-limited-message"><?php echo $slots_message ?></div><?php
        }
    }
}

/*
 * Insert tags on the product listing to reflect the booking status of the product.
 */
 
add_filter("woocommerce_after_shop_loop_item","add_booking_status",12);
function add_booking_status(){
    global $product;
    if( is_wc_appointment_product($product) ){
        
        $slots_in_range = product_slots_bookable($product);
        $appointments = wc_appointments_get_time_slots($product,$slots_in_range);
 
       
        if( !is_wp_error( $appointments ) ) {
            $available_count = 0;

            foreach($appointments as $a){
                $available_count += $a["available"];
            }

            $div_class = is_array($appointments) && $available_count>0 ? "event-available" : "event-sold-out";
            $div_class = is_array($appointments) && $available_count>0 && $available_count<5 ? "event-limited" : $div_class;
            $banner_text = $div_class=="event-sold-out" && is_array($slots_in_range) && count($slots_in_range)==0 ? "CLOSED<br>for bookings" : "SOLD OUT";
    
            ?>
            <div id="wcaep-product-availability-status" class="event-availability-status <?php echo $div_class;?>" data-product-id="<?php echo $product->id?>" data-nonce="<?php echo wp_create_nonce( 'find-scheduled-day-slots' ); ?>">
            <span><?php echo $banner_text;?></span>
            </div><?php
            
        }
    }
    
}

function product_slots($product){
    return product_slots_in_range($product,current_time( 'timestamp' ));
}
 

function product_slots_bookable($product){
    return product_slots_in_range($product);
}

function product_slots_in_range($product,$start_time = null, $end_time = null){
    $min_date = $product->get_min_date_a();
    $max_date = $product->get_max_date_a();
    $check_from = $start_time ? $start_time :  strtotime( "midnight +{$min_date['value']} {$min_date['unit']}", current_time( 'timestamp' ) );
    $check_to   = $end_time ? $end_time : strtotime( "+{$max_date['value']} {$max_date['unit']}", current_time( 'timestamp' ) );
    if ( 'month' === $product->get_duration_unit() ) {
        $check_to = strtotime( 'midnight', strtotime( date( 'Y-m-t', $check_to ) ) );
    }
    return $product->get_slots_in_range($check_from,$check_to);
}

?>
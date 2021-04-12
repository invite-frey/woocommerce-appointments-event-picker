# Woocommerce Appointments Alternative Event Picker

Wordpress plugin extending Woocommerce Appointments.

Woocommerce Appointments comes with a calendar view style datepicker by default. The customer first picks a date and is then presented with a list of available time slots to choose from on that date. This presentation is not suitable for events that occur regaularly but only on specific dates as opposed to every day or most days.

Installing this plugin overrides the default datepicker and displays a list of all available slots for a particular event instead.

In addition some appointment (event) specific items are shown in the Woocommerce shop loop and single product summary:

* List of event dates
* Shows a label on the product when limited (< 5) slots are available.
* Displays a "SOLD OUT" banner on a product when no more open slots are available
* Displays a "CLOSED for bookings" banner on a product if the the next event is in the future, but the current date is less than the required lead time for bookings.

### Shortcodes

`[appointment_products]`

Lists all products of type Appointable. Similar to the standard Woocommerce `[products]` shortcode.

Supported attributes:

* `orderby` - Refer to [Woocommerce docs](https://docs.woocommerce.com/document/woocommerce-shortcodes/)
* `order` - Refer to [Woocommerce docs](https://docs.woocommerce.com/document/woocommerce-shortcodes/)
* `category` - Refer to [Woocommerce docs](https://docs.woocommerce.com/document/woocommerce-shortcodes/)
* `show_historical_appointments` - false|true Default is false. If set to false events with available slots only in the past will not be shown.

### Prerequisites

* [Wordpress](https://wordpress.org/download/)
* [Woocommerce](https://woocommerce.com)
* [Woocommerce Appointments](https://bookingwp.com/plugins/woocommerce-appointments/)

### Installation

* Get the files 

```
$ git clone https://github.com/invite-frey/woocommerce-appointments-event-picker.git
```

* Move the woocommerce-appointments-event-picker directory to your wordpress plugins directory.
* Activate the plugin from the Wordpress admin plugins section.
* That's all.

## Versioning

* 1.0 - First Release

## Donations

Donations are much appreciated if you found this resource useful. 

Bitcoin, Lightning Network and most major credit cards available for donations at [https://frey.hk](https://frey.hk).

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details

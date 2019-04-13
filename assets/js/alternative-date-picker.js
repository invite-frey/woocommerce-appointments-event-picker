jQuery( document ).ready( ($) => {
    'use strict';

    const fetchAppointmentData = (product_id,url,nonce) => {
        let params = {
            'wc-ajax'	: 'wc_appointments_find_scheduled_day_slots',
            'product_id': product_id,
            'security'	: nonce,
        };

        const xhr = $.ajax({
            context: this,
            url: url,
            method: 'POST',
            data: params,
        })
        
        return xhr;
    }

    const date_select_trigger = (e) => {
        const day = parseInt(e.target.dataset.day, 10);
        const month = parseInt(e.target.dataset.month, 10);
        const year = parseInt(e.target.dataset.year,10);
        const form = $('form.wc-appointments-appointment-form-wrap');
        
        if ( year && month && day ) {
            const date = `${year}-${month}-${day}`;
            $('.wcaep-available-date').removeClass('date-selected');
            $(`#available-date-${date}`).addClass("date-selected");
            $('input.appointment_date_day').val(day);
            $('input.appointment_date_month').val(month);
            $('input.appointment_date_year').val(year).change();
            if(form){
                form.find('.wc-appointments-appointment-form-button').prop( 'disabled', true );
                form.triggerHandler( 'date-selected', date );
            }else{
                console.log("Appointment form not found.");
            }
        }else{
            console.log("Invalid date.");
        }
    }

    const write_datelist_wrapper = (container) => {
        container.append(`
            <div class="wcaep-datepicker-list">
            <div class="wcaep-available-dates-header">Available Dates</div>
            </div>
        `);
    }
    
    //----------------------------------------------------------------------------------
    //Modify the product purchase page
    //Use setTimeout to make sure all of this happens after the UI is in its final state.
    setTimeout(() => {
        //Fetch a list of bookable appointments
        const product_id = $('.picker').attr( 'data-product_id' );
        if(!product_id){ return; }

        //Hide the calendar date picker
        $('.ui-datepicker').hide();
        //This works also, but maybe there is a case where the user might want to refer to the calendar view instead:
        //$('.picker').datepicker("destroy");

        write_datelist_wrapper( $('.picker') );
        
        fetchAppointmentData(product_id,wc_appointments_date_picker_args.ajax_url, wc_appointment_form_params.nonce_find_day_slots)
            .done( function( data ) {
                console.log(data);
                const start_date = new Date();
                const now = new Date();
                let min_bookable_date = new Date();
                let days_to_search = 365;
                let sold_out = true;

                if( data.max_date ){
                    switch( data.max_date.unit ){
                        case 'month':
                            const today = new Date();
                            const max_date = new Date();
                            max_date.setMonth( today.getMonth() + data.max_date.value );
                            days_to_search = Math.ceil((max_date - today)/(1000*60*60*24.0)) - 1;
                            break;
                        case 'day':
                            days_to_search = data.max_date.value;
                            break;
                        case 'week':
                            days_to_search = data.max_date.value * 7;
                            break;
                        case 'hour':
                            days_to_search = Math.ceil(data.max_date.value/24.0);
                            break;

                    }
                }
                if( data.min_date ){
                    
                    switch( data.min_date.unit ){
                        case 'month':
                            min_bookable_date.setMonth( now.getMonth() + data.min_date.value );
                            break;
                        case 'day':
                            min_bookable_date.setDate( now.getDate() + data.min_date.value );
                            break;
                        case 'week':
                            min_bookable_date.setDate( now.getDate() + data.min_date.value * 7 );
                            break;
                        case 'hour':
                            min_bookable_date.setHours( now.getHours() + data.min_date.value );
                            break;
                    }
                }

                //Loop through all days in the range that is to be searched and find days with available appointments.
                for ( var i = 0; i < days_to_search; i++ ) {
                    let date =  new Date(start_date)
                    date.setDate(start_date.getDate() + i);
                    const year        = date.getFullYear();
                    const month       = date.getMonth() + 1;
                    const day         = date.getDate();
                    const day_of_week = date.getDay();
                    const ymdIndex    = year + '-' + month + '-' + day;
                    const form = $('form.wc-appointments-appointment-form-wrap')
                    const picker = $('.picker')

                    const number_of_days = wc_appointments_date_picker.get_number_of_days( data.appointment_duration, form, picker );
                    const staff_id    = ( form.find( 'select#wc_appointments_field_staff' ).val() > 0 ) ? form.find( 'select#wc_appointments_field_staff' ).val() : 0;
                    const slot_args = {
                        start_date           : date,
                        number_of_days       : number_of_days,
                        fully_scheduled_days : data.fully_scheduled_days,
                        availability         : data.availability_rules,
                        default_availability : data.default_availability,
                        has_staff            : data.has_staff,
                        staff_id             : staff_id,
                        staff_assignment     : data.staff_assignment
                    };

                    const appointable = wc_appointments_date_picker.is_slot_appointable(slot_args);
                    if(appointable){
                        sold_out = false;
                        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
                        const lang = navigator.language || 'en_US';
                        const dateString = date.toLocaleDateString(lang, options);

                        if( date.getTime() > min_bookable_date.getTime() ){
                            $('.picker .wcaep-datepicker-list').append(`
                                <div class="wcaep-available-date" id="available-date-${ymdIndex}" data-day="${day}" data-month="${month}" data-year="${year}">
                                    <a class="wcaep-date-option" href="#" data-day="${day}" data-month="${month}" data-year="${year}">${dateString}</a>
                                </div>   
                            `)
                        }else{
                            $('.picker .wcaep-datepicker-list').append(`
                                <div class="wcaep-sold-out" id="available-date-${ymdIndex}" data-day="${day}" data-month="${month}" data-year="${year}">
                                    <span>${dateString} CLOSED</span>
                                </div>   
                            `)
                        }
                    }
                }

                if(sold_out){
                    //Are we really sold out, or is event in the past or cancelled.
                    const unavailable_message = data.fully_scheduled_days.length===0 ? "Closed For Bookings" : "SOLD OUT";
                    $('.picker .wcaep-datepicker-list').append(`
                        <div class="wcaep-sold-out">
                            ${unavailable_message}
                        </div>   
                    `)
                }

                //Connect event handler for date selection.
                $( 'body' ).on( 'click', 'a.wcaep-date-option', date_select_trigger );
                $( 'body' ).on( 'click', '.wcaep-available-date', date_select_trigger );

            });
    },0)

    //----------------------------------------------------------------------------------
    //Modify the Event listing page

   


});
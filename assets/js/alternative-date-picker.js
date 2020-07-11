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
            $(`.wcaep-available-date>.checkmark`).attr("opacity", 0);
            $(`#available-date-${date}`).addClass("date-selected");
            $(`#available-date-${date}>.checkmark`).attr("opacity", 1);
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
            <div class="wcaep-available-dates-header">Select a Date</div>
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
                                <svg class="checkmark" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" opacity="0"><path fill="green" d="M20.285 2l-11.285 11.567-5.286-5.011-3.714 3.716 9 8.728 15-15.285z"/></svg>
                                    <a class="wcaep-date-option" href="#" data-day="${day}" data-month="${month}" data-year="${year}" style="position: relative; left: 10px; top: -5px;">${dateString}</a>
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
    //Determine which promos to show 

    setTimeout( () => {
        //Which categories are available?
        const promos = Array.from(document.querySelectorAll(".wpb_wrapper ul.products>li"))

        const productElements = promos.map( el => {
            return Array.from(el.classList)
                .filter( cl => {
                    return cl.match(/(product_cat-)|([a-z-]*)/g).length > 1; 
                })
                .map( cl => {
                    return cl.match(/(product_cat-)|([a-z-]*)/g)[1];
                })
                .filter( cat => cat.length > 0 );
        })
        var categories = {}
        for( const el of productElements ){
            for( const cat of el ){
                categories[cat] = cat
            }
        }

        Array.from(document.querySelectorAll('.product_promos .wpb_column')).forEach( el => el.style.display="none")
        let numVisible = 0

        Object.getOwnPropertyNames(categories).forEach( cat => {
            const elements = document.querySelectorAll(`.promo_product_category_${cat}`)
            if(elements.length>0){
                Array.from(elements).forEach(element => {
                    numVisible += 1
                    element.style.display = "block";
                    element.style.marginLeft = "auto";
                    element.style.marginRight = "auto";
                });
            }
        })

        if(numVisible===0){
            const row = document.querySelector("#productpromos")
            if(row){
                row.style.display = "none";
            }
        }

        console.log(categories)


    }, 0)

   


});
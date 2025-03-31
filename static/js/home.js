// const splicevardbAPI = 'http://127.0.0.1:5000/splicevardb-api'
const splicevardbAPI = 'https://compbio.ccia.org.au/splicevardb-api'

let TOU = false;
let genome_build = "hg38";

const date = new Date();
const date_tag = date.getUTCFullYear() + (1 + date.getUTCMonth()).toString().padStart(2,'0') + date.getUTCDate().toString().padStart(2,'0');

var comma_genes = [];
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

let branchpointIndex = []; // Define an empty array to be filled dynamically
let focus_bp = 0; // Default value

// Function to update focus_bp dynamically based on the latest branchpointIndex
function updateFocusBP(value) {
    focus_bp = value; // Default to 0 if no branchpoints exist
}

// Display all variants with basic api call
// Hide gene-level view on initial load
$( document ).ready(function() {
    // alert("We are in the middle of fixing an issue related to returning variants. Please check back later if no variants are being shown!");
    call_api();

    $('#spliceai_form #spliceai_terms').popup({ on: 'hover'});
    // $('#spliceai_form, #spliceai_terms').hover(
    //     function() {
    //         $('#spliceai_terms').show()
    //     },
    //     function() {
    //         setTimeout(function() {
    //             if(!($('#spliceai_terms:hover').length > 0))
    //                 $('#spliceai_terms').hide();
    //         }, 300);
    //     });  

    if (localStorage.getItem('splicevardb_token')) {
        $('#Login_pull').text('Token');
        const token = localStorage.getItem('splicevardb_token');
        const expiryDate = new Date(parseJwt(token).exp * 1000);
        if (Date.now() >= parseJwt(token).exp * 1000) {
            $('#Signin #welcome_message #welcome_token_refresh').addClass('cci_green');
        }
            
        $('#Signin #login_form').hide();
        $('#Submit_pull').show();
        $('#TOU_pull').hide();
        $('#Login_pull').text('Token');
        $('#Signin #welcome_message').show();
        $('#Signin #welcome_message #welcome_token_expiry').text(`Your token is valid until ${expiryDate.toDateString()}`);
        $('#Signin #welcome_message #welcome_name').text(`Welcome ${parseJwt(token).sub.name}`);
        $('#Signin #welcome_message #welcome_token').val(localStorage.getItem('splicevardb_token'));
    }
    $('#request_button').hide();
    $('#secret_tunnel').hide();
    $('#field_select').change(() => {
        const selected = $('#field_select').val();
        if (selected === 'commercial') {
            $('#commercial_purpose').show();
            $('#purpose').hide();

            $('#register_button').hide();
            $('#request_button').show();
        } else {
            $('#commercial_purpose').hide();
            $('#purpose').show();

            $('#register_button').show();
            $('#request_button').hide();
        }

        if (selected === 'academic') {
            $('#spliceai_checkbox').prop( "checked", true );
        } else {
            $('#spliceai_checkbox').prop( "checked", false );
        }
    });

    // HEADER CONFIGURATION
    // fix main menu to page on passing
    $('.main.menu').visibility({
        type: 'fixed'
    });

    $('.overlay').visibility({
        type: 'fixed',
        offset: 80
    });
      
    // lazy load images
    $('.image').visibility({
        type: 'image',
        transition: 'vertical flip in',
    	duration: 500
    });
      
    // show dropdown on hover
    $('.main.menu  .ui.dropdown').dropdown({
    	on: 'hover'
    });

    // If column visibilty changes then draw the table to update the filters.
    $('#results table').on( 'column-visibility.dt', function ( e, settings, column, state ) {
	    $('#results table').DataTable().draw(false);
    } );

    $('#results table').on( 'search.dt', function () {
        downloadButton();
        variants=tableCount()
    });
});

function logout() {
    localStorage.removeItem('splicevardb_token');
    downloadButton();
    $('#TOU_pull').show();
    $('#Submit_pull').hide();
    $('#Login_pull').text('Sign in');
    $('#Signin #login_form').show();
    $('#Signin #welcome_message').hide();
}

function downloadButton() {
    if (localStorage.getItem('splicevardb_token')) {
    	$(".dt-buttons button").addClass("cci_green");
    } else {
	    $(".dt-buttons button").removeClass("cci_green");
    }
}

function buildToggle(version) {
    var table = $('#results table').DataTable();
    let hg38_column = table.column(1);
    let hg19_column = table.column(2);
    if (version == "hg38") {
        if (!($("#hg38_toggle").hasClass("cci_green"))) {    
            $("#hg19_toggle").removeClass("cci_green")
            $("#hg38_toggle").addClass("cci_green")
            genome_build = "hg38";
            hg19_column.visible(false);
            hg38_column.visible(true);
        }
    } else if (version == "hg19") {
        if (!($("#hg19_toggle").hasClass("cci_green"))) {
            $("#hg38_toggle").removeClass("cci_green")
            $("#hg19_toggle").addClass("cci_green")
            genome_build = "hg19";
            hg38_column.visible(false);
                hg19_column.visible(true);
        }
    }
    
    if ($('#lollipop').is(':visible')) {
        document.getElementById('lollipop').style.display = "none";
        populateProteinPaint();
    }
}

function displayLoader() {
    $('#results').dimmer('show');
    $('#results .dimmer').addClass('inverted');
    $('#results .dimmer').append('<div class="ui text loader">Loading Variants</div>');

    var displayLoaderCheck = window.setInterval(function(){
        if ( $('#DataTables_Table_0').is(":visible") ) {
            $('#buildToggle_buttons').show();
            buildToggle("hg38");
            makeFilter();
            $('#results').dimmer('hide');
            $('#results .dimmer').empty();
            clearInterval(displayLoaderCheck);
            populateProteinPaint();
        }
    },500);
}

$('#Submit_pull').hide();

$('#TOU_pull').on("click", function() {
    $('#Terms').flyout('show');
    $('.ui.dropdown').dropdown();
});

$('#Login_pull').on("click", function() {
    $('#Signin').flyout('show');
    if (localStorage.getItem('splicevardb_token')) {
        const info = parseJwt(localStorage.getItem('splicevardb_token'));
        $('#Signin #login_form').hide();
        $('#Signin #welcome_message').show();
        $('#Signin #welcome_message #welcome_name').text(`Welcome ${info.sub.name}`);
        $('#Signin #welcome_message #welcome_token').val(localStorage.getItem('splicevardb_token'));
    }
    $('.ui.dropdown').dropdown();
});

$('#Submit_pull').on("click", function() {
    if (localStorage.getItem('splicevardb_token')) {
        $('#Submit')
            .flyout('show')
        ;
        $('.ui.dropdown').dropdown();
        $('.ui.radio.checkbox')
            .checkbox()
        ;
        submitOptions("published", "template");
    }
});

function submitOptions(source, format) {
    var $form = $('#Submit form')
    var values = $form.form('get values')
    $('#Submit .ui.error.message').empty();
    // console.log(values)
    if (source) { 
	    $("#submit_source button").removeClass("cci_green")
        $("input[name='published']").val('')
        $("input[name='preprint']").val('')
        $("input[name='unpublished']").val('')
    	if (source == "published") {
            $("#published").addClass("cci_green")
	        $(".field.unpublished").hide()
            $(".field.preprint").hide()
	        $(".field.publication").show()
	        $("input[name='published']").val(true)
    	} else if (source == "preprint") {
	        $("#preprint").addClass("cci_green")
	        $(".field.unpublished").hide()
            $(".field.publication").hide()
            $(".field.preprint").show()
	        $("input[name='published']").val(true)
	        $("input[name='preprint']").val(true)
    	} else if (source == "unpublished") {
	        $("#unpublished").addClass("cci_green")
	        $(".field.preprint").hide()
            $(".field.publication").hide()
            $(".field.unpublished").show()
	        $("input[name='unpublished']").val(true)
    	}
    }

    if (format) {
    	$("#submit_format button").removeClass("cci_green")
        $("input[name='form']").val('')
        $("input[name='template']").val('')
    	if (format == "form") {
            $("#form_submit").addClass("cci_green")
	        $(".field.template, .fields.template").hide()
            $(".field.form, .fields.form").show()
	        $("input[name='form']").val(true)
    	} else if (format == "template") {
            $("#template_submit").addClass("cci_green")
            $(".field.template, .fields.template").show()
            $(".field.form, .fields.form").hide()
            $("input[name='template']").val(true)
    	}
    }
}


function parseJwt (token) {
    var base64Url = token.split('.')[1];
    var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    var jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));

    return JSON.parse(jsonPayload);
}

async function loginSubmit() {
    if ($('#Signin form').form('is valid')) {
	    var $form = $('#Signin form')
	    var values = $form.form('get values')
        const result = await login({
            email: values.email,
            password: values.password
        })
        if (result.token && result.name) {
            const token = result.token;
            localStorage.setItem("splicevardb_token", token);
            downloadButton();

            const expiryDate = new Date(parseJwt(token).exp * 1000);
            
            $('#Signin #login_form').hide();
            $('#TOU_pull').hide();
            $('#Login_pull').text('Token');
            $('#Signin #welcome_message').show();

            $('#Submit_pull').show();
            
            if (Date.now() >= parseJwt(token).exp * 1000) {
                $('#Signin #welcome_message #welcome_token_refresh').addClass('cci_green');
            }
            $('#Signin #welcome_message #welcome_token_expiry').text(`Your token is valid until ${expiryDate.toDateString()}`);
            $('#Signin #welcome_message #welcome_name').text(`Welcome ${parseJwt(token).sub.name}`);
            $('#Signin #welcome_message #welcome_token').val(localStorage.getItem('splicevardb_token'));

        } else {
            const err = result.message;
            alert(err)
        }
    }
}

async function refreshToken() {
    if (localStorage.getItem("splicevardb_token")) {
        const email = parseJwt(localStorage.getItem("splicevardb_token")).sub.email;
        const result = await refresh(email);
        if (result.token) {
            localStorage.setItem("splicevardb_token", result.token);
            $('#Signin #welcome_message #welcome_token').val(result.token);
            if ($('#Signin #welcome_message #welcome_token_refresh').hasClass('cci_green')) {
                $('#Signin #welcome_message #welcome_token_refresh').removeClass('cci_green');
            }
            
        }
    }
}

async function termsSubmit() {
    if ($('#Terms form').form('is valid')) {
	    var $form = $('#Terms form')
	    var values = $form.form('get values')
        const result = await register({
            name: values.name,
            email: values.email,
            password: values.password,
            affiliation: values.affiliation,
            field: values.field,
            purpose: values.purpose,
            spliceai: values.field === 'academic' ? true : values.spliceai === 'on',
            role: values.role
        })
        if (result.token && result.name) {
            const token = result.token;
            localStorage.setItem("splicevardb_token", token);

            const expiryDate = new Date(parseJwt(token).exp * 1000);

            $('#Terms').flyout('hide');
            $('#TOU_pull').hide();
            downloadButton();
            $('#Login_pull').text('Token');
            $('#Signin #welcome_message').show();
            if (Date.now() >= parseJwt(token).exp * 1000) {
                $('#Signin #welcome_message #welcome_token_refresh').addClass('cci_green');
            }
            $('#Signin #welcome_message #welcome_token_expiry').text(`Your token is valid until ${expiryDate.toDateString()}`);
            $('#Signin #welcome_message #welcome_name').text(`Welcome ${parseJwt(token).sub.name}`);
            $('#Signin #welcome_message #welcome_token').val(localStorage.getItem('splicevardb_token'));
        } else {
            const err = result.message;
            alert(err)
        }
    }
}

function emailRequest() {
    if ($('#Terms form').form('is valid')) {
	    var $form = $('#Terms form')
	    var values = $form.form('get values')
        alert('Your request has been submitted to the data access committee, you will be contacted shortly.')
        $('#secret_tunnel').trigger('click');
    }
}

$('#Terms form')
  .form({
    fields: {
      name: {
        identifier: 'name',
        rules: [
          {
            type   : 'empty',
            prompt : 'Please enter your name'
          }
        ]
      },
      email: {
        identifier: 'email',
        rules: [
          {
            type   : 'empty',
            prompt : 'Please enter your email'
          },
	  {
  	    type   : 'doesntContain[medgenome]',
	    prompt : 'Registrations from this company are blocked'
	  }
        ]
      },
      password: {
        identifier: 'password',
        rules: [
          {
            type   : 'empty',
            prompt : 'Please enter a password'
          }
        ]
      },
      field: {
        identifier: 'field',
        rules: [
          {
            type   : 'empty',
            prompt : 'Please select an organisation type'
          }
        ]
      },
      affiliation: {
        identifier: 'affiliation',
        rules: [
          {
            type   : 'empty',
            prompt : 'Please enter an affiliation'
          }
        ]
      },
      terms: {
        identifier: 'terms',
        rules: [
          {
            type   : 'checked',
            prompt : 'You must agree to the terms and conditions'
          }
        ]
      }
    }
  })
;
$('#Signin form')
    .form({
        email: {
            identifier: 'email',
            rules: [
                {
                    type   : 'empty',
                    prompt : 'Please enter your email'
                }
            ]
        },
        password: {
            identifier: 'password',
            rules: [
                {
                    type   : 'empty',
                    prompt : 'Please enter a password'
                }
            ]
        },
    })
;
    

$.fn.dataTable.ext.search.push(function(
    settings,
    searchData,
    index,
    rowData,
    counter
  ) {

    // Get the Datatable global search term.
    var table = new $.fn.dataTable.Api( settings );
    var val = table.search().toLowerCase();

    // Return all rows if search is blank
    if (val === '') {
        return true;
    }

    // Get the columns.
    var columns = settings.aoColumns;

    for (var i = 0, ien = columns.length; i < ien; i++) {

      // If column is visible then check for a match.
      if ( columns[i].bVisible ) {
        if (searchData[i].toLowerCase().indexOf(val) !== -1) {
          return true;  // Matched value - display the row.
        }
      }
    }

    return false;  // No matches - hide row.
});

function variantCount() {
    var table = $('#results table').DataTable();
    return table.page.info().recordsTotal;
}

function fetchVariants(column) {
    var table = $('#results table').DataTable();
    if (column) {
	    var variants = table.column(column).data();
    } else {
	    var variants = table.data();
    }

    return variants.toArray();
}

function tableCount() {
    var table = $('#results table').DataTable();
    var filtered = table.rows( {search:'applied'} ).data();
    return filtered.length;
}

function fetchTableVariants(column) {
    var table = $('#results table').DataTable();
    var filtered = table.rows( {search:'applied'} ).data().toArray();

    if (column) {
        var variants = []
	filtered.forEach(function(variant) {
	    variants.push(variant[column]);
	});
	return variants
    } else {
        return filtered
    }
}

function populateProteinPaint(initial_data) {
    table_data = fetchTableVariants();
    // Runs ProteinPaint if only one gene is left from filtering
    let uniqueGenes = uniqueValues("gene_symbol_list", "filtered");
    
    var mutationReplace = setInterval(function() {
 	if ($('.sja_simpletable').length) {
	    if ($('.sja_simpletable tr:nth-child(2) td:nth-child(1)').text() == "Mutation") {
		$('.sja_simpletable tr:nth-child(2) td:nth-child(1)').text('Variant');
	    }
	}
    }, 100); // check every 100ms

    if (uniqueGenes[0].length == 1) {
        if ( ($('#lollipop').filter(':hidden')) & ($('#gene_plot .dimmer').filter(':hidden')) ) {
            generateProteinPaint(table_data, uniqueGenes[0][0]);
        } else {
            if ( JSON.stringify(table_data) !== JSON.stringify(initial_data) ) {
                generateProteinPaint(table_data, uniqueGenes[0][0]);
            }
        }
    } else if (uniqueGenes[1].length > 0 && $("#geneFilter").val()) {
	    if ( $("#geneFilter").val().length == 1 ) {
            if ( ($('#lollipop').filter(':hidden')) & ($('#gene_plot .dimmer').filter(':hidden')) ) {
                generateProteinPaint(table_data, $("#geneFilter").val()[0]);
            } else {
                if ( JSON.stringify(table_data) !== JSON.stringify(initial_data) ) {
                    generateProteinPaint(table_data, $("#geneFilter").val()[0]);
                }
            }
        } else {
            clearInterval(mutationReplace);
	    $('#gene_plot').dimmer('hide');
            $('#gene_plot .dimmer').empty();
            document.getElementById('lollipop').style.display = "none";
            document.getElementById('lollipop_placeholder').style.display = "block";
        }
    } else {
	clearInterval(mutationReplace);
        $('#gene_plot').dimmer('hide');
        $('#gene_plot .dimmer').empty();
	document.getElementById('lollipop').style.display = "none";
        document.getElementById('lollipop_placeholder').style.display = "block";
    }
    // Recall function every 2 seconds with previous data as a comparison
    setTimeout(function() { populateProteinPaint(table_data) }, 2000);
}

function proteinPaintLoad() {
    $("#gene_plot").dimmer('show');
    $('#gene_plot .dimmer').addClass('inverted');
    $('#gene_plot .dimmer').append('<div class="ui text loader">Loading Visualisation</div>');

    var ppLoadCheck = window.setInterval(function(){
        if ($('.sja_skg').length) {
            $('#gene_plot').dimmer('hide');
            $('#gene_plot .dimmer').empty();
            $('.sja_Block_div').css({"margin":"0","width":"100%"});
            $('.sja_Block_div').children().eq(1).css("width","100%");
            $('.sja_Block_div').children().eq(1).children().eq(0).children().eq(0).attr('transform', 'translate(40,0)');	
            document.getElementsByClassName('sja_Block_div').item(0).children.item(3).style.display = "none";
            $('#lollipop').show();
            clearInterval(ppLoadCheck);
        } else if ($('#gene_plot .dimmer').is(':empty')) {
            clearInterval(ppLoadCheck);	
        }
    },500);
}

async function variantSubmit() {
    const file = $("input[name=templateFile]").prop('files')[0];
    const additionalFile = $("input[name=suppInfo]").prop('files')[0];
    const formData = new FormData();
    formData.append("template", file);
    formData.append("template", additionalFile);
    let token = localStorage.getItem("splicevardb_token") ? localStorage.getItem("splicevardb_token") : '';
    const requestOptions = {
        headers: {
            Authorization: `Bearer ${token}`
        },
        method: "POST",
        body: formData
    };
    
    const response = await fetch(`${splicevardbAPI}/variants/submit`, requestOptions);
    
    if (response.status === 200) {
        alert('Variants submitted successfully (review pending)');
    } else {
        const r = await response.json();
        alert(`Submission failed: ${r.message}`);
    }
}

makeRequest = async (path, method, body) => {
    let token = '';
    if (localStorage.getItem("splicevardb_token")) {
        token = localStorage.getItem("splicevardb_token");
    } else {
        token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IjBiM2VjYjFjLTVhMDAtMTM4Yi0yYjRjLTdlYjdjZmNhMTA1YiIsImlhdCI6MTUxNjIzOTAyMn0.PByel7nVtTsKJLXIekcN_kbl1eHV0K-eBwq6zee9xTQ'
    }

    return fetch(path, {
        method: method || "GET",
        headers: {
            "Content-Type": "application/json",
            ... (token ? { Authorization: `Bearer ${token}` } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : "" ),
    }).then((res) => {
        if (res.status === 401) {
            return res.json();
        } else {
            return res.json();
        }
    });
};

register = async (values) => 
    makeRequest(`${splicevardbAPI}/user/register`, 'POST', values);

login = async (values) =>
    makeRequest(`${splicevardbAPI}/user/login`, 'POST', values);

refresh = async (email) =>
    makeRequest(`${splicevardbAPI}/user/refresh_token?email=${email}`, 'GET', null)

getMyVariant = async (variant_id) =>
    makeRequest(`${splicevardbAPI}/variants/${variant_id}/myvariant`, "GET", null);

getClinvar = async (variant) =>
    makeRequest(`${clinvar}${variant}`, "GET", null);

getValidation = async (variant_id) =>
    makeRequest(`${splicevardbAPI}/variants/${variant_id}`, "GET", null);

getMyGene = async (gene) =>
    makeRequest(`${myGene}${gene}`, "GET", null);

getSpliceAI = async (variant_id) =>
    makeRequest(`${splicevardbAPI}/variants/${variant_id}/spliceai`, "GET", null);

getPangolin = async (variant) =>
    makeRequest(`${pangolinLookup}` + "?hg=37&distance=1000&variant=" + `${variant}`, "GET", null);

getAllGenes = async () =>
    makeRequest(`${splicevardbAPI}/genes/`, "GET", null);

filterVariants = async (payload) =>
    makeRequest(`${splicevardbAPI}/variants/filter`, 'POST', payload)

downloadVariants = async (payload, token) =>
    makeRequest(`${splicevardbAPI}/variants/download`, 'POST', payload)

// Basic API call
function call_api() {
    makeRequest(`${splicevardbAPI}/variants/filter`, 'POST', {
        gene: ['COL4A5']
    })
    .then(function (data) {
        appendData(data.data);
    })
    .catch(function (err) {
        console.log(err);
    });
}

// Add Search Builder
async function makeFilter() {
    $('#DataTables_Table_0_wrapper').prepend('<div id="filters"><button id="" class="ui basic button">Launch Custom Filter</button></div>');

        var allGenes = await getAllGenes();
        var gene_list = allGenes;
        // var gene_list = uniqueGenes[0];
        // comma_genes = uniqueGenes[1];
        var gene_filter = '<div class="filter italic">' +
            '<label>Gene List:</label><select id="geneFilter" class="ui multiple five column search clearable selection dropdown">' +
            '<option value="COL4A5">COL4A5</option>';

        gene_list.forEach(function (gene, index) {
            gene_filter = gene_filter + 
            '<option value="' + gene + '">' + gene + '</option>'
        });
        $('#filters').html(gene_filter + '</select></div>');
        
        var validation_list = uniqueValues(5)[0]; 
        var validation_filter = '<div class="filter">' +
            '<label>Validation Method:</label><select id="valFilter" class="ui multiple search clearable selection dropdown">' +
            '<option value="">Method</option>'
        
        validation_list.forEach(function (validation, index) {
            validation_filter = validation_filter +
                '<option value="' + validation + '">' + validation + '</option>'
        });
        $('#filters').append(validation_filter + '</select></div>');

        var class_list = uniqueValues(6)[0];
        var classification_filter = '<div class="filter">' +
            '<label>Classification:</label><select id="classFilter" class="ui multiple search clearable selection dropdown">' +
            '<option value="">Classification</option>'

        class_list.forEach(function (classification, index) {
            classification_filter = classification_filter +
                '<option value="' + classification + '">' + classification + '</option>'
        });
        $('#filters').append(classification_filter + '</select></div>');

        $('#filters').append('<div class="float right"><button id="removeFilter" class="ui basic button">Reset</button><button id="runFilter" class="ui cci_green button">Filter Results</button></div>');
        $('#runFilter').on('mousedown', function() {
            $('#filters button').addClass('loading');
        });
        $('#runFilter').on('mouseup', function() {
            $('#filters button').removeClass('loading');
            selected_genes=$('#geneFilter').val().filter(g => g !== '');
            selected_val=$('#valFilter').val().filter(v => v !== '');
            selected_class=$('#classFilter').val().filter(c => c !== '');
            if (selected_genes.length !== 0 || selected_val.length !== 0 || selected_class.length !== 0) {
                useFilter(selected_genes, selected_val, selected_class);
            }
        })

        $('#removeFilter').on('mousedown', function() {
            $('#filters button').addClass('loading');
            $('.remove').click();
        });
        $('#removeFilter').on('mouseup', function() {
            $('#filters button').removeClass('loading');
            var table = $('#DataTables_Table_0').DataTable();
            table.searchBuilder.rebuild();
            $('#gene_plot').dimmer('hide');
            $('#gene_plot .dimmer').empty();
            document.getElementById('lollipop').style.display = "none";
            document.getElementById('lollipop_placeholder').style.display = "block";
        })

        $('.ui.dropdown').dropdown();

};

// Run filters
async function useFilter(genes,validations,classifications) {
    const filtered = await filterVariants({
        gene: genes.filter(g => g !== ''),
        classification: classifications.filter(c => c !== ''),
        validation: validations.filter(v => v !== '')
    });
    const newVariants = filtered.data;
    var datatable = $('#DataTables_Table_0').DataTable();
    datatable.clear().draw();
    datatable.rows.add(newVariants); // Add new data
    datatable.columns.adjust().draw(); // Redraw the DataTable
    // populateProteinPaint(fetchTableVariants());
}

// Get unique values from table
function uniqueValues(column, data_type) {
    if (data_type == "filtered") {
        data = fetchTableVariants(column);
    } else {
	data = fetchVariants(column);
    }

    let list = [];
    let commas = []
    data.forEach(function(entry) {
        if (entry.includes(",")) {
            entry.split(",").forEach(function(split) {
                list.push(split);
                commas.push(split)
            });
        } else {
            list.push(entry);
        }
    });
    let uniqueList = [...new Set(list.sort())];
    let uniqueCommasList = [...new Set(commas.sort())];
    return [uniqueList.sort(), uniqueCommasList.sort()];
}

function jsonToTSV(jsonData) {
    let tsv = '';
    // Get the headers
    let headers = Object.keys(jsonData[0]);
    tsv += headers.join('\t') + '\n';
    // Add the data
    jsonData.forEach(function (row) {
        let data = headers.map(header => JSON.stringify(row[header])).join('\t'); // Add JSON.stringify statement
        tsv += data + '\n';
    });
    return tsv;
}

async function download() {
    const variants = Object.values($('#results table').DataTable().rows( {search:'applied'} ).data()).map(d => `${d.variant_id}`);
    const variantDownload = await downloadVariants({variant_ids: variants});
    const tsvData = jsonToTSV(variantDownload);
    const blob = new Blob([tsvData], { type: 'text/tsv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'splicevardb.download.tsv';
    document.body.appendChild(a);
    a.click();
    a.remove();
}

async function downloadAll() {
    const variantDownload = await downloadVariants({});
    const tsvData = jsonToTSV(variantDownload);
    const blob = new Blob([tsvData], { type: 'text/tsv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'splicevardb.download.tsv';
    document.body.appendChild(a);
    a.click();
    a.remove();
}

// Adds passed data into the display table
function appendData(variants) {
    // clear the table
    $('.variants table > tbody').empty();

    var table = $('.variants table').DataTable({
        data: variants,
	    dom: 'QfrtipB',
	    buttons: [
            {
            	filename: 'splicevardb.' + date_tag,
		        extension: '.tsv',
		        fieldSeparator: '\t',
                text: 'Download Filtered Variants',
                exportOptions: {
                    modifier: {
                        search: 'none'
                    }
                },
                attr: {
                    id: 'download_some'
                },
            	action: async function ( e, dt, node, config ) {
                    $("#download_some").addClass('loading');
                    if (localStorage.getItem('splicevardb_token')) {
			            await download();
                        $("#download_some").removeClass('loading');
                    } else {
                    	$('#Signin').flyout('show');
                        var awaitTOC = window.setInterval(function(){
                            if ( !$('#Terms').hasClass("visible") ) {
                                if (localStorage.getItem('splicevardb_token')) {
                                    $("#download_some").trigger("click");
                                }
                                $("#download_some").removeClass('loading'); 
                                clearInterval(awaitTOC);
                            }
                        },500);
                    }
		        }
            },
            {
            	filename: 'splicevardb.' + date_tag,
		        extension: '.tsv',
		        fieldSeparator: '\t',
                text: 'Download All Variants',
                exportOptions: {
                    modifier: {
                        search: 'none'
                    }
                },
                attr: {
                    id: 'download_all'
                },
            	action: async function ( e, dt, node, config ) {
                    $("#download_all").addClass('loading');
                    if (localStorage.getItem('splicevardb_token')) {
			            await downloadAll();
                        $("#download_all").removeClass('loading');
                    } else {
                    	$('#Signin').flyout('show');
                        var awaitTOC = window.setInterval(function(){
                            if ( !$('#Terms').hasClass("visible") ) {
                                if (localStorage.getItem('splicevardb_token')) {
                                    $("#download_all").trigger("click");
                                }
                                $("#download_all").removeClass('loading'); 
                                clearInterval(awaitTOC);
                            }
                        },500);
                    }
		        }
            }
    	],
        columns: [
            {
                className: 'dt-control',
                orderable: false,
                data: null,
                defaultContent: '',
            },
            { data: 'chr' },
		    { data: 'chr' },
            { data: 'gene_symbol_list' },
            { data: 'hgvs_RefSeq' },
            { data: 'method_report'},
            { data: 'classification'},
		    { data: 'location'}
        ],
        columnDefs: [
            {
                "target": 1,
                "render": function( data, type, row) {
                    return data +'-'+ row.pos_hg38 +'-'+ row.ref +'-'+ row.alt;
                },
            },
	        {
                "target": 2,
                "render": function( data, type, row) {
                    return data +'-'+ row.pos_hg19 +'-'+ row.ref +'-'+ row.alt;
            	},
            },
            {
                "target": 3,
                "render": function( data, type, row) {
                    return '<i>' + data + '</i>';
                },
            },
	        {
                "target": 7,
                "visible": false,
                "searchable": true
	        }
	    ]
    });

    $('tbody').on('click', 'td.dt-control', async function () {
        var tr = $(this).closest('tr');
        var row = table.row(tr);
	    // console.log(row)
        if (row.child.isShown()) {
            // This row is already open - close it
            row.child.hide();
            tr.removeClass('shown');
        } else {
            // Open this row
	    row.child(formatChild(row.data(), row)).show();
        tr.addClass('shown');

	    $('.igvToggle').on('click', function() {
    		var table = $('.variants table').DataTable()
    		var tr = $(this).closest('tr').prev('.shown');
    		var row = table.row(tr);
		    $(this).hide();
		    formatIGV(row);
	    });

	    formatVariantInfo(row.data(), await getMyVariant(row.data().variant_id));
		
        // let ensembl_id = myVariant_data.cadd.gene[0].gene_id;
        // let myGene_data = await getMyGene(ensembl_id);
	    formatValidation(await getValidation(row.data().variant_id));

        if (localStorage.getItem('splicevardb_token') && parseJwt(localStorage.getItem('splicevardb_token')).sub.spliceai) {
            const spliceai_data = await getSpliceAI(row.data().variant_id);
            // console.log(spliceai_data)
            formatInSilicos(row.data(), spliceai_data);
        } else {
            if (!localStorage.getItem('splicevardb_token')) {
                formatInSilicos(row.data(), null, error='login');
            } else {
                formatInSilicos(row.data(), null, error='permission');
            }
        }
        

        // if (spliceAI_data && pangolin_data) {
	    // 	var spliceAI_score = spliceAI_data.scores[0]
		//     var pangolin_score = pangolin_data.scores[0]
		    
        // } else {
		//     $('.insilico_id' + row.data().variant_id).append('<p>ERROR: No Scores Returned.</p>');
	    // }

	    // formatIGV(row)
	}
    });
};

// $('.igvToggle').on('click', function() {
function formatIGV(row) {
    if (genome_build == "hg19") {
	var variant_pos = row.data().pos_hg19;
	var reference_object = {
        "id": "hg38",
        "name": "Human (GRCh37/hg19)",
        "fastaURL": "https://s3.amazonaws.com/igv.broadinstitute.org/genomes/seq/hg19/hg19.fa",
        "indexURL": "https://s3.amazonaws.com/igv.broadinstitute.org/genomes/seq/hg19/hg19.fa.fai",
        "cytobandURL": "https://s3.amazonaws.com/igv.broadinstitute.org/annotations/hg19/cytoBandIdeo.txt",
        "tracks": [
            {
                "name": "Refseq Genes",
            "format": "refgene",
                "url": "https://s3.amazonaws.com/igv.org.genomes/hg19/refGene.txt.gz",
                "order": 1000000,
                "indexed": false,
            "visibilityWindow": -1,
            "removable": false,
            "displayMode": "COLLAPSED"
            }
        ]
  	}
    } else if (genome_build == "hg38") {
	var variant_pos = row.data().pos_hg38;
	var reference_object = {
        "id": "hg38",
        "name": "Human (GRCh38/hg38)",
        "fastaURL": "https://s3.amazonaws.com/igv.broadinstitute.org/genomes/seq/hg38/hg38.fa",
        "indexURL": "https://s3.amazonaws.com/igv.broadinstitute.org/genomes/seq/hg38/hg38.fa.fai",
        "cytobandURL": "https://s3.amazonaws.com/igv.broadinstitute.org/annotations/hg38/cytoBandIdeo.txt",
        "tracks": [
            {
                "name": "Refseq Genes",
                "format": "refgene",
                "url": "https://s3.amazonaws.com/igv.org.genomes/hg38/refGene.txt.gz",
                "order": 1000000,
                "indexed": false,
                "visibilityWindow": -1,
                "removable": false,
                "displayMode": "COLLAPSED"
            }
        ]
	}
    }

    var igvDiv = row.child().find(".variant-visualisation")[0];
    igvDiv.style.minHeight = "300px";
    if ( row.data().classification == "Splice-altering" ) {
        var color = "rgba(219, 61, 61, 0.5)";
    } else if ( row.data().classification == "Low-frequency" ) {
        var color = "rgba(128, 82, 160, 0.5)";
    } else if ( row.data().classification == "Normal" ) {
        var color = "rgba(57, 135, 204, 0.5)";
    } else {
        var color = "rgba(140,140,140, 0.5)";
    }
    var options =
        {
	    locus: "chr" + row.data().chr + ':' + (variant_pos - 200) + "-" + (variant_pos - -200),
            roi: [
                    {
                        name: "Variant",
                        color: color,
                        features: [
                            {
                                chr: "chr" + row.data().chr,
                                start: variant_pos - 1,
                                end: variant_pos,
                                description: "Variant of interest",
                            }
                        ]
                    }
            ],
            tracks: [
                    {
                        name: "U12",
                        type: "annotation",
                        format: "bed",
                        url: "https://raw.githubusercontent.com/CCICB/introme/master/annotations/U12." + genome_build + ".bed.gz",
                        displayMode: "EXPANDED",
			height: 40,
                        color: "#ff0000",
                    },
                    {
                        name: "Branchpoints",
                        type: "annotation",
                        format: "bed",
                        url: "https://raw.githubusercontent.com/CCICB/introme/master/annotations/branchpointer." + genome_build + ".bed.gz",
                        displayMode: "EXPANDED",
			height: 40,
                        color: "#ff0000",
                    },
            ],
	    reference: reference_object
    };
    igv.createBrowser(igvDiv, options)
};


// proteinPaint Plot
function generateProteinPaint(data, gene) {
    document.getElementById('lollipop_placeholder').style.display = "none";
    $('#lollipop').empty();
    $('.sja_menu_div').remove();
    if (gene === '') {
        return;
    }
    proteinPaintLoad();
    let proteinPaintData = convert_to_protein_paint(data);
    runproteinpaint({
         noheader:1,
         holder: document.getElementById('lollipop'),
         parseurl:true,
         nobox:1,
         genome: genome_build,
         gene: gene,
         mclassOverride: {
             className: 'Classification',
             classes: {
                 S: {
                     label: 'Splice-altering',
                     color: '#db3d3d'
                 },
                 L: {
                     label: 'Low-frequency',
                     color: '#8052a0'
                 },
                 N: {
                     label: 'Normal',
                     color: '#3987cc'
                 },
		 X: {
		     label: 'Conflicting',
		     color: '#808080'
		 }
             }
        },
        tracks:[{
            type:'mds3',
            name:'SpliceVarDB',
            custom_variants: JSON.parse(JSON.stringify(proteinPaintData)),
        }]
    });
    var proteinPaintLabelReplace = setInterval(function() {
        if ($('div.sja_Block_div').length) {
	    $('div.sja_Block_div div:nth-child(2) svg g:nth-child(1) g:nth-child(4) g:nth-child(2) g:nth-child(3)').remove();
            clearInterval(proteinPaintLabelReplace);
	}
    }, 100); // check every 100ms
};

function convert_to_protein_paint(snv) {
    let result = [];
    snv.forEach(function (variant, index) {
	if (genome_build == "hg19") {
	    var variant_pos = variant.pos_hg19;
        } else if (genome_build == "hg38") {
            var variant_pos = variant.pos_hg38;
        }
	
        // Extract the first letter of the classification to use for the class
        let classifier = variant.classification.charAt(0).replace("C", "X");
        plot_item = {
            'dt': 1,
	    //'mname': variant.hgvs_RefSeq.split(":")[1],
            'gene': variant.gene_symbol_list,
            'chr': "chr" + variant.chr,
            'pos': Number(variant_pos),
            'ref': variant.ref,
            'alt': variant.alt,
            'class': classifier
        }
        result.push(plot_item);
    });
    return result;
}

function formatChild(d, row) {
    return (
        '<div class="ui grid">' +
            '<div class="ui row">' +
	            '<div class="one wide column" style="padding: 0;"></div>' + //padding
	            '<div class="varinfo_id' + d.variant_id + ' five wide column" style="padding: 0;"><h5>Variant Information</h5></div>' +
                '<div class="insilico_id' + d.variant_id + ' five wide column" style="padding: 0;"><h5>Splicing <i>In Silicos</i>:</h5></div>' +
                '<div class="validation_id' + d.variant_id + ' five wide column" style="padding: 0"><h5>Validation Details</h5></div>' +
	        '</div>' +
	        '<div class="row">' +
	            '<div class="sixteen wide column" style="padding: 0;">' +
                    '<div class="variant-visualisation" id="igv-div" style="padding: 5px 10px;">' +
                '</div>' + 
	            '<div class="ui button igvToggle" style="width: 100%; padding: 10px 0; border-radius: 0 0 10px 10px">Load IGV</div>' +
	        '</div>'+
        '</div>'
    );
}

function formatVariantInfo(d, myVariant_data) {
    if (myVariant_data.annotation) {
        $('.varinfo_id' + d.variant_id).html(
            '<h5>Variant Information</h5>' +
            '<div class="clinvar-label"></div>' +
            '<div class="ui segment clinvar" style="background-color: ' + myVariant_data.annotation.clinvar_colour + '; margin: 0.5em 0; padding: 0.5em;">' +
            '<h5>' + myVariant_data.annotation.clinvar_sig + '</h5>'+
            (myVariant_data.annotation.clinvar_star_rating == 0 ? '</div>' : '<div class="clinvar-star" style="--rating: ' + myVariant_data.annotation.clinvar_star_rating + ';"></div></div>') +
            (myVariant_data.annotation.rsid ? '<p>rsID: <a href="https://www.ncbi.nlm.nih.gov/snp/' + myVariant_data.annotation.rsid + '" target="_blank">' + myVariant_data.annotation.rsid + '</a></p>' : "" ) +
            '<p>gnomAD Genome AF: ' + myVariant_data.annotation.genome_af + '</p>' +
            '<p>gnomAD Exome AF: ' + myVariant_data.annotation.exome_af + '</p>' +
            '<p>gnomAD Homozygotes: ' + (myVariant_data.annotation.genome_hom + myVariant_data.annotation.exome_hom) + '</p>' +
            '<p>Variant Location: ' + d.location + '</p>' +
            '<p>Consequence: ' + myVariant_data.annotation.consequence + '</p>'
        );
    } else {
        $('.varinfo_id' + d.variant_id).html(
            '<h5>Variant Information</h5>' +
            '<div class="clinvar-label"></div>' +
            '<div class="ui segment clinvar" style="background-color: #FDFDED; margin: 0.5em 0; padding: 0.5em;">' +
            '<h5>Not Present in ClinVar</h5></div>'+
            '<p>gnomAD Genome AF: 0</p>' +
            '<p>gnomAD Exome AF: 0</p>' +
            '<p>gnomAD Homozygotes: 0</p>' +
            '<p>Variant Location: ' + d.location + '</p>' +
            '<p>Consequence: N/A</p>'
        );
    }
}

function formatInSilicos(d, spliceAI_data, error=false) {
    if (!error) {
        if (spliceAI_data.annotation) {
            $('.insilico_id' + d.variant_id).html('<h5>Splicing <i>In Silicos</i>:</h5>' +
                '<p>Introme: ' + d.introme + '</p>' +
                '<p>SpliceAI:</p>' +
                '<ul><li>Acceptor Gain: ' + spliceAI_data.annotation.splice_ai.acceptor_gain + '</li>' +
                '<li>Acceptor Loss: ' + spliceAI_data.annotation.splice_ai.acceptor_loss + '</li>' +
                '<li>Donor Gain: ' + spliceAI_data.annotation.splice_ai.donor_gain + '</li>' +
                '<li>Donor Loss: ' + spliceAI_data.annotation.splice_ai.donor_loss + '</li></ul>' +
                '<p>Pangolin:</p>' +
                '<ul><li>Gain: ' + spliceAI_data.annotation.pangolin.gain + '</li>' +
                '<li>Loss: ' + spliceAI_data.annotation.pangolin.loss + '</li>'
            );
        } else {
            $('.insilico_id' + d.variant_id).html('<h5>Splicing <i>In Silicos</i>:</h5>' +
                '<div class="ui segment clinvar" style="background-color: #FDFDED; margin: 0.5em 0; padding: 0.5em;">' +
                '<h5>Not Present in SpliceAI</h5></div>'
            )
        }
    } else {
        if (error === 'login') {
            $('.insilico_id' + d.variant_id).html('<h5>Splicing <i>In Silicos</i>:</h5>' +
                '<div class="ui segment clinvar" style="background-color: #FDFDED; margin: 0.5em 0; padding: 0.5em;">' +
                '<h5><a id="spliceai_login">Sign in</a> to see <i>In Silicos</i> scores</h5></div>'
            )
            $("#spliceai_login").click(() => {
                $('#Signin').flyout('show');
                $('.ui.dropdown').dropdown();
            })
        } else {
            $('.insilico_id' + d.variant_id).html('<h5>Splicing <i>In Silicos</i>:</h5>' +
                '<div class="ui segment clinvar" style="background-color: #FDFDED; margin: 0.5em 0; padding: 0.5em;">' +
                "<h5>You don't have permission to view SpliceAI In-Silico scores</h5></div>"
            )
        }
    }
}

// Format and append third column in variant expand
// Add entry for each validation attached to that variant ID
function formatValidation(v) {
    if (v.validation) {
        Object.keys(v.validation).map((method, index) => {
            const item = v.validation[method];
            $('.validation_id' + v.variant_id).append(
                '<p>' + method + 
            '<ul><li><a href="https://doi.org/' + item.doi +'" target="_blank">' + item.doi + '</a></p>' +
                (item.tissue ? '<li>Tissue used: ' + item.tissue + '</li>' : "" ) +
                (item.metric1_name ? '<li>' + item.metric1_name + ': ' + item.metric1 + '</li>' : "" ) +
                (item.metric2_name ? '<li>' + item.metric2_name + ': ' + (item.doi == "10.1371/journal.pgen.1009884" ? (item.metric2 == 0 ? "<0.05" : ">=0.05" ) : item.metric2) + '</li>' : "" ) +	    
                '<li>Classification: ' + item.classification + '</li></ul>'
            );
        })
    }
}

// Map nucleotides to CSS classes
    const nucleotideColors = {
      A: 'A',
      T: 'T',
      G: 'G',
      C: 'C',
    };

function defineHeuristics(exonEnd, exonStart) {
    exonStart = exonStart - 1;
    exonEnd = exonEnd - 1;
    return [
        { range: [exonEnd - 2, exonEnd - 2], heuristic: ['DD12', 'DD3'] },
        { range: [exonEnd - 1, exonEnd - 1], heuristic: ['DD11', 'DD3'] },
        { range: [exonEnd - 0, exonEnd - 0], heuristic: ['DD7', 'DD4'] },
        { range: [exonEnd + 1, exonEnd + 2], heuristic: 'DD2' },
        { range: [exonEnd + 3, exonEnd + 3], heuristic: ['DD8', 'DD5'] },
        { range: [exonEnd + 4, exonEnd + 4], heuristic: ['DD10', 'DD5'] },
        { range: [exonEnd + 5, exonEnd + 5], heuristic: ['DD6', 'DD4'] },
        { range: [exonEnd + 6, exonEnd + 6], heuristic: 'DD9' },
        { range: [exonStart - 24, exonStart - 7], heuristic: 'DA9' },
        { range: [exonStart - 2, exonStart - 1], heuristic: 'DA2' },
        { range: [exonStart - 3, exonStart - 3], heuristic: ['DA4', 'DA3'] },
        { range: [exonStart - 4, exonStart - 4], heuristic: 'DA8' },
        { range: [exonStart - 6, exonStart - 5], heuristic: 'DA5' },
        { range: [exonStart + 0, exonStart + 0], heuristic: ['DA6', 'DA3'] },
        { range: [exonStart - 24, exonStart - 5], heuristic: 'DA1' },
    ];
}

function getHeuristics(position, heuristicMap) {
    return heuristicMap
        .filter(({ range }) => position >= range[0] && position <= range[1])
        .flatMap(({ heuristic }) => (Array.isArray(heuristic) ? heuristic : [heuristic]));
}
 
function parseSequence(sequenceInput, exonEnd, exonStart, variant) {

    // Validate sequence
    if (!/^[ATGC]+$/.test(sequenceInput)) {
        alert('Invalid sequence! Only A, T, G, and C are allowed.');
        return;
    }

    const sequenceLength = sequenceInput.length;

    if (exonEnd < 1 || exonEnd > sequenceLength) {
        alert('Exon end position is out of range.');
        return;
    }

    if (exonStart < 1 || exonStart > sequenceLength) {
        alert('Exon start position is out of range.');
        return;
    }

    branchpointIndex = findBranchpoint(sequenceInput.substring(exonStart-53,exonStart-15), exonStart-53);

    const outputDiv = document.getElementById('output');
    outputDiv.innerHTML = '';

    const heuristicsDiv = document.getElementById('heuristics');
    heuristicsDiv.innerHTML = '';
    const heuristicMap = defineHeuristics(exonEnd, exonStart);

    // Render the sequence
    for (let i = 0; i < sequenceLength; i++) {
        const nucleotide = sequenceInput[i];
        const span = document.createElement('span');
        span.className = `nucleotide ${nucleotide}`;

        // Calculate position label
        let label;

        if (i < exonEnd) {
            label = `E${i - exonEnd}`; // Exonic position
                span.classList.add('exon');
        } else if (i + 1 < exonStart) {
            if (exonStart - (i + 1) >= (i + 1) - exonEnd) { 
                label = `+${(i + 1) - exonEnd}`; // Intronic position (closer to upstream)
            } else {
                label = -(exonStart - (i + 1)); // Intronic position (closer to downstream)
            }
        } else {
            label = `E+${i + 2 - exonStart}`; // Exonic position
            span.classList.add('exon');
        }

	    // Highlight the variant location
        if (i == variant) {
            span.classList.add('variant');
            const heuristics = getHeuristics(i, heuristicMap);
            if (heuristics) {
                populateHeuristics(heuristics);
                $("#heuristics").prepend(`<h3>The following heuristics apply at position ${label}:</h3>`)
            } else {
                $("#heuristics").text(`<h3>No heuristics apply at position ${label}.</h3>`)
            }
        }

        if (i - exonEnd >= -3 && i - exonEnd < 6) {
            let firstEmptyTd = $('#donor td:empty').first();
            firstEmptyTd.addClass(`${nucleotide}`);
            firstEmptyTd.text(nucleotide);

            span.classList.add('donor', 'with-bar');
            firstEmptyTd.on('click', () => {
                const heuristics = getHeuristics(i, heuristicMap);
                populateHeuristics(heuristics);
            });
        } else if (exonStart - i < 22 && exonStart - i >= -1 ) {
            let firstEmptyTd = $('#acceptor td:empty').first();
            firstEmptyTd.addClass(`${nucleotide}`);
            firstEmptyTd.text(nucleotide);
	
            span.classList.add('acceptor', 'with-bar')
            firstEmptyTd.on('click', () => {
                const heuristics = getHeuristics(i, heuristicMap);
                populateHeuristics(heuristics);
            });
        } else if (branchpointIndex.some(bp => i >= bp.index && i < bp.index + 5)) {
            const bpMatch = getMatchNumber(branchpointIndex, i)
	        span.classList.add('branchpoint', 'with-bar', `bpOpt${bpMatch}`);
        } else if ( i % 10 == 0) {
            span.classList.add('chevron');
        }

        span.setAttribute('data-index',i);
        span.setAttribute('data-content', label);
        span.textContent = nucleotide;

        span.addEventListener('click', () => {
            const heuristics = getHeuristics(i, heuristicMap);
            populateHeuristics(heuristics);
        });

        outputDiv.appendChild(span);
    }
    fitSpansToContainer('output');
    updateFocusBP(branchpointIndex.length-1)
    selectBP(branchpointIndex);
    $('.nucleotide').popup();
};

function findBranchpoint(inputString, inputIndex) {
    const regex = /.T.A./g;
    const matches = Array.from(inputString.matchAll(regex)).map(match => ({
        ...match,
        index: match.index + inputIndex,
        label: -52 + match.index
    }));

    return matches;
}

function getMatchNumber(branchpointIndex, i) {
    return branchpointIndex
        .map((bp, idx) => ({ matchNumber: idx, ...bp })) // Add match numbers (1-based)
        .filter(bp => i >= bp.index && i < bp.index + 5) // Filter by range
        .map(bp => bp.matchNumber); // Return only match numbers
}

function selectBP(branchpoints) {
    $('.nucleotide.branchpoint.with-bar').addClass('reduced-opacity');
    $(`.nucleotide.branchpoint.with-bar.bpOpt${focus_bp}`).removeClass('reduced-opacity');

    let bp_tds = $('#branchpoint td'); // Select all <td> elements

    let sequence = branchpoints[focus_bp]["0"]
    for (let i = 0; i < sequence.length; i++) {
    	if (i < bp_tds.length) { // Ensure we don't go beyond available <td> elements
            $(bp_tds[i]).removeClass();
            $(bp_tds[i]).addClass(sequence[i]); // Add class based on nucleotide
            $(bp_tds[i]).text(sequence[i]); // Fill <td> with nucleotide
            $(bp_tds[i+5]).text(branchpoints[focus_bp]["label"]+i); // Fill <td> with nucleotide label
        }
    }

    variant_label = String($('.variant.with-bar').data('content'))
    const tableCells = document.querySelectorAll(".motif td");

    $('.motif tr:nth-child(2) td').removeClass();
    tableCells.forEach(td => {
        console.log(td.textContent.trim())
        if (td.textContent.trim() === variant_label) {
            td.classList.add("variant");
        }
    });

    // Enable/disable buttons based on available branchpoints
    $('#bp_scroll_left').prop('disabled', focus_bp === 0);
    $('#bp_scroll_right').prop('disabled', focus_bp === branchpoints.length - 1);
}

// Attach event listeners to buttons
$('#bp_scroll_left').on('click', function () {
    if (focus_bp > 0) {
        focus_bp--;
        selectBP(branchpointIndex, focus_bp);
    }
});

$('#bp_scroll_right').on('click', function () {
    if (focus_bp < branchpointIndex.length - 1) {
        focus_bp++;
        selectBP(branchpointIndex, focus_bp);
    }
});

function fitSpansToContainer(containerId) {
    const container = document.getElementById(containerId);
    const spans = container.querySelectorAll('span');

    let maxFontSize = 20;
  
    const getTotalWidth = () => {
        // Hide the container to force recalculation
        container.style.display = 'none';
        container.offsetHeight; // Trigger reflow while hidden
        container.style.display = ''; // Show the container again

        // Sum up the widths of all spans
        return Array.from(spans).reduce((total, span) => total + span.getBoundingClientRect().width, 0);
    };

    const adjustFontSize = () => {
        let fontSize = maxFontSize;

        while (getTotalWidth() > container.getBoundingClientRect().width && fontSize > 1) {
            fontSize--;

            // Apply font size to all spans
            spans.forEach(span => {
                span.style.fontSize = `${fontSize}px`;
            });

            // Hide and show the container to force a layout recalculation
            container.style.display = 'none'; // Hide container
            container.offsetHeight; // Trigger reflow while hidden
            container.style.display = ''; // Show container again
        }
        adjustedFontSize = fontSize;
        spans.forEach(span => (span.style.fontSize = `${adjustedFontSize}px`));
    };

    container.addEventListener('mousemove', (event) => {
        const hoveredElement = event.target;

        if (hoveredElement.tagName === 'SPAN') {
            const hoveredIndex = Array.from(spans).indexOf(hoveredElement);

            // Adjust font sizes based on proximity to the hovered span
            spans.forEach((span, index) => {
                const distance = Math.abs(index - hoveredIndex);
                const zoomedFontSize = Math.max(Math.max(adjustedFontSize * 3, 50) - distance * 4, adjustedFontSize); // Larger for closer spans
                span.style.fontSize = `${zoomedFontSize}px`;
            });
        }
    });

    // Reset font sizes to adjustedFontSize when mouse leaves the container
    container.addEventListener('mouseleave', () => {
        spans.forEach(span => (span.style.fontSize = `${adjustedFontSize}px`));
    });
    
    adjustFontSize();
}

function populateHeuristics(heuristics) {
    const heuristicsDiv = document.getElementById('heuristics');
	// Clear heuristics when a new nucleotide is clicked
    heuristicsDiv.innerHTML = '';

    heuristics.forEach(heuristic => {
        const heuristicDiv = document.createElement('div');
        heuristicDiv.className = 'heuristic';

        const img = document.createElement('img');
        img.src = `heuristics/${heuristic}.png`;
        img.alt = heuristic;

        const explanation = document.createElement('p');
        explanation.textContent = `This variant falls under the heuristic ${heuristic}.`;

        heuristicDiv.appendChild(img);
        heuristicDiv.appendChild(explanation);

        heuristicsDiv.appendChild(heuristicDiv);
    });
}

async function fetchFeature(feature, chromosome, start, end) {
    const url = `https://rest.ensembl.org/overlap/region/human/${chromosome}:${start}..${end}?content-type=application/json;feature=${feature}`;
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error('Failed to fetch genome sequence');
    }
    const data = await response.json();
    return data;
}

async function fetchGenomeSequence(chromosome, start, end, buffer) {
    const url = `https://rest.ensembl.org/sequence/region/human/${chromosome}:${start-buffer}..${end+buffer}?content-type=application/json`;
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error('Failed to fetch genome sequence');
    }
    const data = await response.json();
    return data.seq;
}

async function fetchAndDisplaySequence(variant) {
    const buffer = 5;
    try {
		const transcripts = await fetchFeature('transcript', variant.chrom, variant.pos, variant.pos);
        const maneSelectTranscript = transcripts.find(t => t.tag && t.tag.includes("MANE_Select"));
		
		const featureTranscript = maneSelectTranscript;
		const exons = await fetchFeature('exon', variant.chrom, featureTranscript.start, featureTranscript.end);
		const featureExons = exons.filter(t => t.Parent === featureTranscript.id);

		// Find the closest end value that is less than the defined end
		const closestEnd = featureExons.reduce((prev, curr) =>
    		(curr.end <= variant.pos && (!prev || curr.end > prev.end)) ? curr : prev, null);

		// Find the closest start value that is greater than the defined start
		const closestStart = featureExons.reduce((prev, curr) =>
    		(curr.start >= variant.pos && (!prev || curr.start < prev.start)) ? curr : prev, null);

		console.log("Closest End:", closestEnd);
		console.log("Closest Start:", closestStart);
		
		const sequence = await fetchGenomeSequence(variant.chrom, closestEnd.end, closestStart.start, buffer-1)
		const var_pos = variant.pos-closestEnd.end+buffer-1
		const alt_sequence = replaceCharAt(sequence, var_pos, variant.ref, variant.alt);
		parseSequence(alt_sequence.toUpperCase(), buffer, alt_sequence.length-buffer+1, var_pos)

		$('#' + 'sequence-container').html("<div>" +
            `<h3>MANE Select Transcript: ${featureTranscript.id}</h3>` +
		    `<p>Exons in region: ${closestEnd.rank} - ${closestStart.rank}</p>` +
		    `<p>Sequence for region: ${variant.chrom}:${closestEnd.end}-${closestStart.start}</p>` +
		    `<p style="overflow: scroll;">${sequence}</p>` +
            "</div>")

	} catch (error) {
        console.error(error);

        document.getElementById('sequence-container').textContent = 'Error fetching sequence.';
    }
}

async function parseVariant() {
	const variant = $("#variant").val().trim()
    const genomeVersion = 38

    const norm_variant = await normaliseVariant(variant, genomeVersion)
    fetchAndDisplaySequence(norm_variant)
}

// Input variant normalisation from bw spliceai-lookup
async function normaliseVariant(variant, genomeVersion) {
/* Convert the given variant to a standardized "{chrom}-{pos}-{ref}-{alt}" string using a regular expression, or
* if that fails, assume the variant is in HGVS notation and try using the Ensembl hgvs API to convert it.
*
* Args:
*  variant (string): user input text
*  genomeVersion (string): "37" or "38"
*
* Return:
*  string: the input variant reformatted as a "{chrom}-{pos}-{ref}-{alt}" string
*/
    const ensemblApiPrefix = `https://${genomeVersion == '37' ? 'grch37.' : ''}rest.ensembl.org/vep/human/hgvs/`
	const VARIANT_RE = new RegExp(
        "^[\\s]*" +
        "(chr)?([0-9XYMTt]{1,2})" +
        "[-\\p{Pd}\\s:]+" +
        "([0-9,]+)" +
        "[-\\p{Pd}\\s:]*" +
        "([ACGT]+)" +
        "[-\\p{Pd}\\s:>]+" +
        "([ACGT]+)",
        'iu'
    )

    let chrom, pos, ref, alt, variantConsequence
    let matchedRegExp = variant.match(VARIANT_RE)
    let ensemblApiUrl, ensemblApiResponse, ensemblApiResponseJson
    if (matchedRegExp) {
        // was able to parse the user input using a simple reg-exp
        chrom = matchedRegExp[2].toUpperCase()
        pos = parseInt(matchedRegExp[3].replace(/,/g, ""))
        ref = matchedRegExp[4].toUpperCase()
        alt = matchedRegExp[5].toUpperCase()

        if (ref.length == 1) {
            //handle SNPs and insertions
            ensemblApiUrl = `${ensemblApiPrefix}${chrom}:g.${pos}${ref}>${alt}`
        } else if(alt.length == 1) {
            //handle deletions
            ensemblApiUrl = `${ensemblApiPrefix}${chrom}:g.${pos+1}_${pos+ref.length-1}del${ref.slice(1)}`
        } else {
            //converting MNP into HGVS is not straight forward, so just return the variant
            return { 'variant': `${chrom}-${pos}-${ref}-${alt}` }
        }
    }
    else {
        //assume the variant is already in HGVS notation
        ensemblApiUrl = `${ensemblApiPrefix}${variant.trim()}`
    }


    // try calling the Ensembl API on the user input
    try {
        try {
            ensemblApiResponse = await makeRequest(ensemblApiUrl + "?content-type=application/json&vcf_string=1")
        } catch (error) {
            console.error(error)
            throw Error(`Ensembl API call failed: Unable to reach server`)
        }

        ensemblApiResponseJson = await ensemblApiResponse

        if (!ensemblApiResponseJson) {
    let errorText = `${ensemblApiResponseJson.error}`
            //const unableToParseHGVSErrorMatch = errorText.match("Unable to parse HGVS notation")
            //if (unableToParseHGVSErrorMatch) {
            //    errorText = `Ensembl API is unable to parse the variant ${variant}: ${errorText}`
            //}
            const refAlleleErrorMatch = errorText.match(
                new RegExp("[(]([ACGTRYSWKMBDHVN]+)[)] does not match reference allele given by HGVS notation"))
            if (refAlleleErrorMatch) {
                errorText = `${variant} has an unexpected reference allele. The hg${genomeVersion} reference allele should be ${refAlleleErrorMatch[1]}`
            }

            throw Error(errorText);
        }

        if (!ensemblApiResponseJson[0] || !ensemblApiResponseJson[0].vcf_string) {
            throw Error(`Unexpected response: ${ensemblApiResponseJson}`);
        }

        variant = ensemblApiResponseJson[0].vcf_string
        variantConsequence = ensemblApiResponseJson[0].most_severe_consequence
        matchedRegExp = variant.match(VARIANT_RE)
        if (!matchedRegExp) {
            throw Error(`Unexpected response: ${ensemblApiResponseJson}`)
        }

        chrom = matchedRegExp[2].toUpperCase()
        pos = parseInt(matchedRegExp[3])
        ref = matchedRegExp[4].toUpperCase()
        alt = matchedRegExp[5].toUpperCase()

        result = {
            'variant': `${chrom}-${pos}-${ref}-${alt}`,
            'chrom': chrom,
            'pos': pos,
            'ref': ref,
            'alt': alt,
            'consequence': variantConsequence,
        }
        console.log("EnsemblAPI result:", result)

        return result

    } catch (error) {
        console.error(error)
        throw Error(error)
    }
}

function replaceCharAt(sequence, var_pos, ref, alt) {
    if (var_pos < 0 || var_pos >= sequence.length) {
        console.error("Position out of range");
        return sequence;
    }
    
    if (sequence[var_pos] !== ref) {
        console.error(`Mismatch: Expected '${ref}' at position ${var_pos}, found '${sequence[var_pos]}'`);
        return;
    }

    return sequence.substring(0, var_pos) + alt + sequence.substring(var_pos + 1);
}


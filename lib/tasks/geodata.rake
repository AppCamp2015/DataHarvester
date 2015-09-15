namespace :geodata do

		require 'httparty'
		require 'json'
		require 'pry'
		
	desc "Get all layers metadata"
	task generate_layer_meta: :environment do
		
		# get the layers and create data objects for viable layers at the endpoint

		response = HTTParty.get('http://a.ramani.ujuizi.com/ddl/wms?item=menu&menu=&request=GetMetadata&token=null')

		responseObject = JSON.parse(response.body)

		binding.pry

		f = File.new('layermeta.json',"w")
		f.write(JSON.pretty_generate(responseObject))
		f.close

	end

	desc "Get available times for a layer"
	task generate_time_periods_for_layer: :environment do

		layername = CGI::escape(ENV['LAYER'])

		layerData = HTTParty.get('http://a.ramani.ujuizi.com/ddl/wms?item=layerDetails&layerName='+layername+'&time=&request=GetMetadata&token=b163d3f52ebf1cf29408464289cf5eea20cda538&package=com.web.ramani')

		responseObject = JSON.parse(layerData.body)

		f = File.new(layername+'.json',"w")
		f.write(JSON.pretty_generate(responseObject))
		f.close
	end

	desc "Get all times for all layers"
	task generate_all_time_data: :environment do
		
		response = HTTParty.get('http://a.ramani.ujuizi.com/ddl/wms?item=menu&menu=&request=GetMetadata&token=null')
		responseObject = JSON.parse(response.body)

		binding.pry
		# for each layer description, iterate through each child element to find the layer time data for each child and append the time data
		# for each child to to object
		responseObject['children'].each do |layer|
			# get the children
			layer['children'].each do |child|

				response = HTTParty.get('http://a.ramani.ujuizi.com/ddl/wms?item=layerDetails&layerName='+child['id']+'&time=&request=GetMetadata&token=b163d3f52ebf1cf29408464289cf5eea20cda538&package=com.web.ramani')				
				child['timedata'] = JSON.parse(response.body)
				binding.pry
			end
		end
		binding.pry

	end

end
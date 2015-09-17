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
	task generate_day_data_for_layer: :environment do

		layername = CGI::escape(ENV['LAYER'])

		layerData = HTTParty.get('http://a.ramani.ujuizi.com/ddl/wms?item=layerDetails&layerName='+layername+'&time=&request=GetMetadata&token=b163d3f52ebf1cf29408464289cf5eea20cda538&package=com.web.ramani')

		responseObject = JSON.parse(layerData.body)

		f = File.new(layername+'.json',"w")
		f.write(JSON.pretty_generate(responseObject))
		f.close
	end

	desc "Get all days for all layers"
	task generate_all_day_data: :environment do
		
		response = HTTParty.get('http://a.ramani.ujuizi.com/ddl/wms?item=menu&menu=&request=GetMetadata&token=null')
		responseObject = JSON.parse(response.body)

		binding.pry
		# for each layer description, iterate through each child element to find the layer time data for each child and append the time data
		# for each child to to object
		responseObject['children'].each do |layer|
			# get the children
			layer['children'].each do |child|
				begin
					response = HTTParty.get('http://a.ramani.ujuizi.com/ddl/wms?item=layerDetails&layerName='+child['id']+'&time=&request=GetMetadata&token=b163d3f52ebf1cf29408464289cf5eea20cda538&package=com.web.ramani')				
					child['timedata'] = JSON.parse(response.body)
				rescue 
					retry
				end
			end
		end

		# additionally for each child, find the available times for each layer
		binding.pry
		f = File.new('daydata.json',"w")
		f.write(JSON.pretty_generate(responseObject))
		f.close
	end

	desc "Get Timestamps for a layer"
	task generate_timestamps_layer: :environment do
		# for each child, build a date string for each valid date and query the timestamps for each valid date

	end

	desc "Get Timestamps for all layers"
	task generate_timestamps_all: :environment do

	end 
	protected

	def jump_next
		next
	end
end
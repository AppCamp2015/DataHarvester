namespace :geodata do

		require 'httparty'
		require 'json'
		require 'pry'

	def generateDataForCity(city)
	time = "2009-01-01T00:00:00.000Z"
	layername = "simS3seriesCoverGlobal/coverclass" 
	
	minLat = city['position']['minLat']
	maxLat = city['position']['maxLat']
	minLong = city['position']['minLong']
	maxLong = city['position']['maxLong']


	subdivs = 5
	latExtent = maxLat - minLat
	longExtent = maxLong - minLong

	lat = minLat
	long = minLong
	linestring = ""
	latStepSize = latExtent  / subdivs
	for i in 0..subdivs-1 do
		lat = lat + latStepSize
		thisLine = "#{minLong}%20#{lat},#{maxLong}%20#{lat},"
		linestring = linestring + thisLine
	end
	return callRamaniforJson(layername, time, linestring[0...-1])
end
def callRamaniforJson(layer, time, linestring)
	response  = HTTParty.get("http://ramani.ujuizi.com/ddl/wms?token=b163d3f52ebf1cf29408464289cf5eea20cda538&package=com.web.ramani&REQUEST=GetTransect&LAYER=#{layer}&CRS=EPSG:4326&ELEVATION=null&TIME=#{time}&LINESTRING=#{linestring},&FORMAT=text/json&COLORSCALERANGE=-140,140&NUMCOLORBANDS=250&LOGSCALE=false&PALETTE=redblue&VERSION=1.1.1")
	results = JSON.parse(response.body)
	return results
end

		
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

		def getDayData(layer)
			begin
					response = HTTParty.get('http://a.ramani.ujuizi.com/ddl/wms?item=layerDetails&layerName='+layer['id']+'&time=&request=GetMetadata&token=b163d3f52ebf1cf29408464289cf5eea20cda538&package=com.web.ramani')				
					layer['timedata'] = JSON.parse(response.body)
					puts "response received for #{layer['id']}"
			rescue 
					puts "response timed out for #{layer['id']}"
			end
			return layer
		end

		

		# for each layer description, iterate through each child element to find the layer time data for each child and append the time data
		# for each child to to object
		responseObject['children'].each do |layer|
			# get the children
			layer['children'].each do |child|
				child = getDayData child
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

	desc "Generate transects for bounding box for a layer"
	task generate_transectbb_for_layer: :environment do
		
		def callRamaniforJson(layer, time, linestring)
				response  = HTTParty.get("http://ramani.ujuizi.com/ddl/wms?token=b163d3f52ebf1cf29408464289cf5eea20cda538&package=com.web.ramani&REQUEST=GetTransect&LAYER=#{layer}&CRS=EPSG:4326&ELEVATION=null&TIME=#{time}&LINESTRING=#{linestring},&FORMAT=text/json&COLORSCALERANGE=-140,140&NUMCOLORBANDS=250&LOGSCALE=false&PALETTE=redblue&VERSION=1.1.1")
				results = JSON.parse(response.body)
		end
		time = "2009-01-01T00:00:00.000Z"
		layername = "simS3seriesCoverGlobal/coverclass" 
		boundingbox = '48.13,48.14,11.56,11.57'

		subdivs = 5
		boxcoords = boundingbox.split(',')
		latExtent = boxcoords[1].to_f - boxcoords[0].to_f
		longExtent = boxcoords[3].to_f - boxcoords[2].to_f

		lat = boxcoords[0].to_f
		long = boxcoords[2].to_f
		linestring = ""
		latStepSize = latExtent  / subdivs
		for i in 0..subdivs-1 do
			lat = lat + latStepSize
			thisLine = [[boxcoords[2],lat],[boxcoords[3],lat]]
			thisLine = "#{boxcoords[2]}%20#{lat},#{boxcoords[3]}%20#{lat},"
			linestring = linestring + thisLine
		end
		callRamaniforJson(layername, time, linestring[0...-1])

	end

	desc "Generate transect data for a file containing cities"
	task generate_cities_transects: :environment do
		citiesFile = JSON.parse(File.read('Germany.json'))
		
		citiesFile.each do |city|
			begin
			satellitedata = generateDataForCity(city)
			city['satellitedata'] = satellitedata
			puts "Writing data for #{city['City']}"
			rescue
			city['satellitedata'] = 'Timed out'
			end
		end		
		f = File.new('citytransects.json',"w")
		f.write(JSON.pretty_generate(citiesFile))
		f.close
	end

end
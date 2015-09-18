namespace :geodata do

		require 'httparty'
		require 'json'
		require 'pry'

	def request_nearest_time_in(requestLayers)
		# finds the valid dates between the daterange 
		puts "Generating layer metadata"
		# layers = getMetaData()
		# requiredLayers = layers['children'].select {|child| child.include? requestlayers}
		# requestLayers.include? layers['children'].first['children'].first['id']

		timedata = []

		requestLayers.each do |layer|
					returnvalue ={}
					returnvalue['id'] = layer
					returnvalue['timedata'] = getDayDataID layer
					timedata.push(returnvalue)
		end

		# layers['children'].each do |layer|
		# 	# get the children
		# 	layer['children'].each do |child|
		# 		if requestLayers.include? child['id']
		# 			binding.pry
		# 			returnvalue ={}
		# 			returnvalue['id'] = child['id']
		# 			returnvalue['timedata'] = getDayData child
		# 			timedata.push(returnvalue)
		# 		end
		# 	end
		# end
		return timedata
	end

	def getDayDataID(layerid)
		begin
				response = HTTParty.get('http://ramani.ujuizi.com/ddl/wms?item=layerDetails&layerName='+layerid+'&time=&request=GetMetadata&token=b163d3f52ebf1cf29408464289cf5eea20cda538&package=com.web.ramani')				
				layer = JSON.parse(response.body)
				puts "response received for #{layerid}"
		rescue 
				puts "response timed out for #{layerid}"
		end
		return layer
	end



	def getDayData(layer)
		begin
				response = HTTParty.get('http://ramani.ujuizi.com/ddl/wms?item=layerDetails&layerName='+layer['id']+'&time=&request=GetMetadata&token=b163d3f52ebf1cf29408464289cf5eea20cda538&package=com.web.ramani')				
				layer['timedata'] = JSON.parse(response.body)
				puts "response received for #{layer['id']}"
		rescue 
				puts "response timed out for #{layer['id']}"
		end
		return layer
	end

	def getMetaData
		response = HTTParty.get('http://ramani.ujuizi.com/ddl/wms?item=menu&menu=&request=GetMetadata&token=null')
		responseObject = JSON.parse(response.body)
		return responseObject
	end

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
		responseData = callRamaniforJson(layername, time, linestring[0...-1])
		outputArray = []

		responseData['transect']['transectData'].each do |trans|
			trans['city'] = city['City']
			trans['time'] = time
			trans['layer'] = layername
			outputArray.push(trans)
		end
		f = File.new("transects/transects-#{city['Country']}-#{city['City']}.json","w")
		f.write(JSON.pretty_generate(outputArray))
		f.close
	end

	def generateDataForCityAndLayer(city,layer)
	time = "2009-01-01T00:00:00.000Z"
	layername = layer 
	
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

	def generateDataForCityLayerTime(city,time,layer)
		layername = layer 
		
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
		responseData = callRamaniforJson(layername, time, linestring[0...-1])
		outputArray = []
		if responseData == "Timed out"
			return
		end
		responseData['transect']['transectData'].each do |trans|
			trans['city'] = city['City']
			trans['time'] = time
			trans['layer'] = layername
			outputArray.push(trans)
		end
		outputlayername = layername.gsub(/\//	,'-')
		binding.pry
		f = File.new("transects/transects-#{outputlayername}-#{city['Country']}-#{city['City']}.json","w")
		f.write(JSON.pretty_generate(outputArray))
		f.close
	end

def callRamaniforJson(layer, time, linestring)
	
	timeout = false
	begin
		response  = HTTParty.get("http://ramani.ujuizi.com/ddl/wms?token=b163d3f52ebf1cf29408464289cf5eea20cda538&package=com.web.ramani&REQUEST=GetTransect&LAYER=#{layer}&CRS=EPSG:4326&TIME=#{time}&LINESTRING=#{linestring},&FORMAT=text/json&COLORSCALERANGE=-140,140&NUMCOLORBANDS=250&LOGSCALE=false&PALETTE=redblue&VERSION=1.1.1")
	rescue
		timeout = true	
	end
	if timeout == false
		results = JSON.parse(response.body)
	else
		results = "Timed out"
	end
	return results
end

		
	desc "Get all layers metadata"
	task generate_layer_meta: :environment do
		
		# get the layers and create data objects for viable layers at the endpoint

		response = HTTParty.get('http://a.ramani.ujuizi.com/ddl/wms?item=menu&menu=&request=GetMetadata&token=null')

		responseObject = JSON.parse(response.body)


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
		
		responseObject = getMetaData()
		
		# for each layer description, iterate through each child element to find the layer time data for each child and append the time data
		# for each child to to object
		responseObject['children'].each do |layer|
			# get the children
			layer['children'].each do |child|
				child = getDayData child
			end
		end

		# additionally for each child, find the available times for each layer
		f = File.new('daydata.json',"w")
		f.write(JSON.pretty_generate(responseObject))
		f.close

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
		citiesFile = JSON.parse(File.read('italy.json'))
		
		citiesFile.each do |city|
			begin
			generateDataForCity(city)
			# city['satellitedata'] = satellitedata
			puts "Writing data for #{city['City']}"
			rescue
			city['satellitedata'] = 'Timed out'
			end
		end		
		# f = File.new('italycitytransects.json',"w")
		# f.write(JSON.pretty_generate(citiesFile))
		# f.close
		puts "Success"
	end
 
	task generate_for_layers_and_cities_and_times: :environment do

		# layersfile = CGI::escape(ENV['LAYER'])
		# citiesfile = CGI::escape(ENV['CITY'])
		
		# timeLayerObject = request_times_in(daterange,layer)
		# timeLayerObject = request_times_in('date','simS3seriesCoverGlobal/coverclass')
		reqdlayers = ["simS5seriesForAirQualityEuro/no2_conc","simS5seriesForAirQualityEuro/o3_conc","simS5seriesForAirQualityEuro/so2_conc","simS3seriesLaiGlobal/lai","simS3seriesCoverGlobal/coverclass","simS3seriesNighttimeLightsGlob/brightness"]
		timeLayerObject = request_nearest_time_in(reqdlayers)

		# layers = JSON.parse(File.read(layersfile))
		# cities = JSON.parse(File.read(citiesfile))
		cities = JSON.parse(File.read('Germany.json'))
		cities.each do |city|
			timeLayerObject.each do |timelayer|
				puts "Generating Data for #{city['City']}"
				generateDataForCityLayerTime(city,timelayer['timedata']['nearestTimeIso'],timelayer['id'])
			end
		end

	end

end